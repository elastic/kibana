/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import pMap from 'p-map';
import { tags } from '@kbn/evals';
import type { EvaluationDataset, EvalsClient } from '@kbn/evals';
import type { ConversationRound } from '@kbn/agent-builder-common';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
} from '@kbn/nightshift-shared';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { evaluate } from '../../src/evaluate';
import { restoreKnowledge } from '../../src/knowledge/restore_knowledge';
import { loadInvestigationDataset } from './datasets';
import { getDatasetCustomContext, replaceCustomContext } from './custom_context';
import {
  ORCABENCH_ES_CONNECTOR_ID,
  saveConnectorSetOnInvestigator,
  saveConnectorsOnInvestigator,
} from './connector_sets';
import { createInvestigationJudges, createOrcaEvaluators } from './judges';
import { orcaJudgeConnector } from './orca_judge';
import { efficiencyEvaluators } from './efficiency_evaluators';
import { INVESTIGATION_TIMEOUT_MS, runInvestigation, waitForInvestigationToEnd } from './task';
import { assertScoresWithinQueryLimit } from './score_budget';
import { assertSuccessfulSandboxCommand } from './trace_evidence';
import { createAdminSessionRequest } from './admin_session_request';
import type { AdminSessionRequestOptions } from './admin_session_request';
import type { InvestigationExample, InvestigationTaskOutput } from './types';
import { hasOrcaTelemetryQuery, resolveOrcaTelemetryVariant } from './orca_dataset';
import {
  getOrcaCutoff,
  getOrcaCutoffs,
  mintOrcaCutoffKeys,
  resolveOrcaEsCredentials,
  withOrcaKeysInvalidated,
} from './orca_cutoff';
import { createOrcaCutoffGate } from './orca_cutoff_gate';
import { saveOrcaConnector } from './orca_connector';
import {
  assertExecutionSuccessRate,
  executionSuccessEvaluator,
  getExecutionFailure,
} from './execution_success';

// CI runs the suite on a serverless observability Scout cluster.
const suiteTags = [...tags.serverless.observability.complete];
// How long an ORCA investigation that outlived its poll may take to end before its cutoff's key is
// taken off the connector.
const ORCA_SETTLE_MS = 2 * 60_000;

/** Registers a dataset with the native investigation task, RCA judges and execution checks. */
export const registerInvestigationEvaluation = ({
  name,
  loadDataset = loadInvestigationDataset,
  trustUpstreamDataset = Boolean(process.env.NIGHTSHIFT_DATASET_NAME),
  orca = false,
  metadata: experimentMetadata = {},
}: {
  name: string;
  loadDataset?: (
    client: Pick<EvalsClient, 'getDatasetByName' | 'upsertDataset'>
  ) => Promise<EvaluationDataset<InvestigationExample>>;
  trustUpstreamDataset?: boolean;
  orca?: boolean;
  metadata?: Record<string, string | number>;
}): void => {
  evaluate.describe(`Nightshift investigations: ${name}`, { tag: suiteTags }, () => {
    // Scout retries a failed test once on CI; expensive investigations must not run twice.
    evaluate.describe.configure({ retries: 0 });
    evaluate(
      'grades investigations with the RCA judges and persists complete agent traces',
      async ({
        config,
        esClient,
        executorClient,
        connector,
        fetch,
        evalsClient,
        traceEsClient,
        repetitions,
        concurrency: requestedConcurrency,
        log,
        inferenceClient,
        evaluationConnector,
        kbnUrl,
        kbnClient,
        samlAuth,
      }) => {
        if (orca) {
          expect(repetitions, 'ORCA runs each incident once').toBe(1);
        }
        const orcaCredentials = orca ? resolveOrcaEsCredentials() : undefined;
        const dataset = await loadDataset(evalsClient);
        // An ORCA task reads telemetry only up to its snapshot, through a key whose document-level
        // security stops there.
        const orcaVariant = orca ? resolveOrcaTelemetryVariant() : undefined;
        const cutoffs = orcaVariant ? getOrcaCutoffs(dataset.examples) : [];
        // The bundled synthetic examples supply their own evidence and must not query a cluster.
        const bundledSynthetic =
          !orca && !process.env.NIGHTSHIFT_EXAMPLES_FILE && !process.env.NIGHTSHIFT_DATASET_NAME;
        // Customer-0 judges use the suite's evaluation connector. ORCA judges use a fixed model,
        // not the agent under test.
        const judgeConnector = orca ? orcaJudgeConnector(evaluationConnector) : evaluationConnector;
        const judgeDeps = {
          inferenceClient: inferenceClient.bindTo({ connectorId: judgeConnector.id }),
          evaluationConnector: judgeConnector,
          log,
        };
        const judges = createInvestigationJudges(judgeDeps);
        const evaluators = [
          ...judges,
          ...(orca ? createOrcaEvaluators(judgeDeps) : []),
          executionSuccessEvaluator,
          ...efficiencyEvaluators,
        ];
        const evaluatorsByName = new Map(evaluators.map((each) => [each.name, each]));
        assertScoresWithinQueryLimit({
          examples: dataset.examples.length,
          repetitions,
          evaluators: evaluators.length,
        });
        // The evals_nightshift_investigations config set sizes Task Manager for 16 investigations.
        const concurrency = Math.min(orca ? 8 : 16, requestedConcurrency);
        // ORCA runs one cutoff at a time, so only investigations sharing a cutoff run together.
        const rounds = orca
          ? cutoffs.reduce(
              (sum, cutoff) =>
                sum +
                Math.ceil(
                  (dataset.examples.filter((example) => getOrcaCutoff(example) === cutoff).length *
                    repetitions) /
                    concurrency
                ),
              0
            )
          : Math.ceil((dataset.examples.length * repetitions) / concurrency);
        const timeoutMs =
          rounds * (INVESTIGATION_TIMEOUT_MS + (orca ? ORCA_SETTLE_MS : 0) + 2 * 60_000) +
          5 * 60_000 +
          // Minting and checking each ORCA cutoff's key, and putting it on the connector.
          cutoffs.length * 60_000;
        evaluate.setTimeout(timeoutMs);
        // Investigations only run as the Nightshift agent service account, so the space has to be
        // set up first. The eval user holds manage_security; setup is idempotent. On stateful,
        // Elasticsearch has no predefined roles for the account, so the eval creates them first.
        await ensureNightshiftServiceAccountRoles(esClient, { isServerless: config.serverless });
        // UIAM rejects the native superuser behind `fetch` on Serverless, so setup there runs as
        // the admin's SAML session, as the plugin's Scout API tests do.
        const setupRequest = config.serverless
          ? createAdminSessionRequest(
              kbnUrl.get('/'),
              (await samlAuth.asInteractiveUser('admin')).cookieHeader
            )
          : <T>(path: string, { method, query, body, version }: AdminSessionRequestOptions) =>
              fetch<T>(path, {
                method,
                ...(query ? { query } : {}),
                ...(body ? { body } : {}),
                ...(version ? { version } : {}),
              });
        // Like the app's setup step: find or create the accounts by name, then bind the space to
        // the ids the backend assigned (generated ones on Serverless).
        const serviceAccountIds = await ensureNightshiftServiceAccounts(
          createHttpServiceAccountsApi({
            request: setupRequest,
            getStatus: (error) => (error as { status?: number }).status,
          }),
          { isServerless: config.serverless }
        );
        await expect
          .poll(
            async () =>
              setupRequest<{ installed: boolean; bound: boolean }>(
                '/internal/nightshift/investigations/service_account/_enable',
                { method: 'POST', body: JSON.stringify({ serviceAccountIds }) }
              ).then(
                ({ installed, bound }) => installed && bound,
                (error: unknown) => {
                  log.warning(`Nightshift setup failed, retrying: ${String(error)}`);
                  return false;
                }
              ),
            // Setup needs the managed workflows plugin to be ready after a cold start.
            { timeout: 120_000, intervals: [5_000] }
          )
          .toBe(true);
        await expect
          .poll(
            async () =>
              (
                await fetch<{ available: boolean }>(
                  `/internal/nightshift/investigations/availability?connector_id=${encodeURIComponent(
                    connector.id
                  )}`
                )
              ).available,
            { timeout: 60_000 }
          )
          .toBe(true);
        // Availability can turn true while Kibana is still installing the managed workflow after a
        // cold start.
        await expect
          .poll(
            async () =>
              fetch(`/api/workflows/workflow/${NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID}`, {
                headers: { 'elastic-api-version': '2023-10-31' },
              }).then(
                () => true,
                () => false
              ),
            { timeout: 60_000 }
          )
          .toBe(true);
        await replaceCustomContext(fetch, getDatasetCustomContext(dataset));
        const knowledgeMetadata = await restoreKnowledge({ esClient, log });
        const runExperiment = ({
          runConcurrency,
          task,
        }: {
          runConcurrency: number;
          task: (example: InvestigationExample) => Promise<InvestigationTaskOutput>;
        }) =>
          executorClient.runExperiment(
            {
              name: orca
                ? 'Nightshift ORCA investigation traces'
                : 'Nightshift graded investigation traces',
              datasets: [dataset],
              trustUpstreamDataset,
              concurrency: runConcurrency,
              metadata: {
                ...experimentMetadata,
                ...knowledgeMetadata,
                concurrency,
                ...(orca ? { telemetry_cutoffs: cutoffs.length } : {}),
              },
              task,
            },
            evaluators
          );

        let experimentResults: Awaited<ReturnType<typeof runExperiment>>;
        if (orcaCredentials && orcaVariant) {
          const { url } = orcaCredentials;
          const { apiKeys, invalidate } = await mintOrcaCutoffKeys({
            credentials: orcaCredentials,
            cutoffs,
            variant: orcaVariant,
            // Minted after the timeout is set, so no key expires while the test can still run.
            expiresInMs: timeoutMs,
          });
          const keyFor = (cutoff: string) => {
            const apiKey = apiKeys.get(cutoff);
            if (!apiKey) throw new Error(`No ORCA key was minted for cutoff ${cutoff}`);
            return apiKey;
          };
          log.info(
            `ORCA: ${dataset.examples.length} tasks read through ${cutoffs.length} cutoff keys, one cutoff at a time`
          );
          // The keys only serve the investigations, so they are revoked as soon as those finish.
          experimentResults = await withOrcaKeysInvalidated(invalidate, async () => {
            // Nightshift runs only in the default space, so its one investigator reads ORCA through
            // one connector, which holds the key of the cutoff whose investigations are running.
            await saveOrcaConnector(kbnClient, { url, apiKey: keyFor(cutoffs[0]) });
            await saveConnectorsOnInvestigator(fetch, [ORCABENCH_ES_CONNECTOR_ID]);
            const inCutoff = createOrcaCutoffGate({
              concurrency,
              activate: (cutoff) => saveOrcaConnector(kbnClient, { url, apiKey: keyFor(cutoff) }),
            });
            return runExperiment({
              // Every task enters the gate at once, and the gate runs `concurrency` of them.
              runConcurrency: dataset.examples.length * repetitions,
              task: (example) =>
                inCutoff(getOrcaCutoff(example), async () => {
                  const output = await runInvestigation(fetch, example, connector);
                  const { investigation_id: investigationId, case_id: caseId } = output;
                  // The next cutoff's key must not reach an investigation that outlived its poll.
                  if (
                    investigationId &&
                    !(await waitForInvestigationToEnd(fetch, investigationId, ORCA_SETTLE_MS))
                  ) {
                    throw new Error(
                      `ORCA investigation ${investigationId} (${caseId}) still ran ${
                        ORCA_SETTLE_MS / 60_000
                      } minutes after its timeout, so no other cutoff's key can be put in place`
                    );
                  }
                  return output;
                }),
            });
          });
        } else {
          await saveConnectorSetOnInvestigator(fetch, { withoutConnectors: bundledSynthetic });
          experimentResults = await runExperiment({
            runConcurrency: concurrency,
            task: (example) => runInvestigation(fetch, example, connector),
          });
        }
        const [experiment] = experimentResults;

        const runs = Object.values(experiment.runs);
        expect(runs).toHaveLength(dataset.examples.length * repetitions);
        expect(new Set(runs.map(({ metadata }) => metadata?.case_id))).toEqual(
          new Set(dataset.examples.map(({ metadata }) => metadata.case_id))
        );
        const scoresPerRun = evaluators.length;
        await expect
          .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
            timeout: 60_000,
          })
          .toBe(runs.length * scoresPerRun);
        const { examples } = await evalsClient.getExperimentDatasetExamples(
          experiment.id,
          experiment.datasetId
        );
        const scores = examples.flatMap((example) => example.scores);
        expect(scores).toHaveLength(runs.length * scoresPerRun);

        // A failed investigation is scored, not fatal: the eval fails only when too many runs fail.
        const failures = runs.flatMap((run) => {
          const output = run.output as InvestigationTaskOutput;
          const reason = getExecutionFailure(output);
          return reason ? [{ caseId: output.case_id, reason }] : [];
        });
        for (const { caseId, reason } of failures) {
          log.warning(`Investigation ${caseId} did not complete: ${reason}`);
        }
        assertExecutionSuccessRate(failures, runs.length);
        const casesWithOrcaTelemetry: string[] = [];

        await pMap(
          runs,
          async (run) => {
            const output = run.output as InvestigationTaskOutput;
            // Completed runs must have persisted their conversation and agent trace.
            if (!getExecutionFailure(output)) {
              const conversation = await fetch<{ rounds: ConversationRound[] }>(
                `/api/agent_builder/conversations/${encodeURIComponent(
                  output.conversation_id ?? ''
                )}`,
                { headers: { 'elastic-api-version': '2023-10-31' } }
              );
              expect(conversation.rounds.length).toBeGreaterThan(0);
              expect(conversation.rounds).toHaveLength(output.conversation_round_count ?? 0);
              if (orca && hasOrcaTelemetryQuery(conversation.rounds)) {
                casesWithOrcaTelemetry.push(output.case_id);
              }
              if (bundledSynthetic) {
                assertSuccessfulSandboxCommand(conversation.rounds);
              }
              expect(output.traceId).toMatch(/^[a-f0-9]{32}$/);
            }
            // The harness trace-correlation checks (run/score trace-id equality and the
            // assertAgentTrace .toPass block) were removed due to pre-existing flakiness: an
            // assertAgentTrace 60s timeout and Playwright cross-retry trace-id contamination.

            const exampleScores = scores.filter(
              (score) =>
                score.example.index === run.exampleIndex &&
                score.task.repetition_index === run.repetition
            );
            expect(exampleScores).toHaveLength(scoresPerRun);
            const [score] = exampleScores;
            expect(score.example.metadata?.case_id).toBe(output.case_id);
            // The examples listing returns previews only; the full output comes from the details route.
            const details = await evalsClient.getExperimentExampleDetails(
              experiment.id,
              experiment.datasetId,
              score.example.id,
              run.repetition
            );
            // Scores are stored under a deterministic id (experiment/example/evaluator/repetition) via a
            // create-only ingest, so a Playwright retry re-runs this example under the SAME experiment id
            // and the first attempt's persisted output wins the 409 conflict. The retry's fresh
            // investigation (new conversation/investigation/trace ids and a nondeterministic report) then
            // differs from that persisted copy, so a strict deep-equal of the whole output can never hold
            // across a retry. Assert instead that the details route returned the full (non-preview) output
            // for THIS example — its stable, example-derived identity — which still catches a mis-keyed
            // fetch without deep-equaling volatile per-attempt LLM output.
            const persistedOutput = details.task.output as InvestigationTaskOutput | null;
            expect(persistedOutput).not.toBeNull();
            expect(persistedOutput?.case_id).toBe(output.case_id);
            expect(persistedOutput?.query).toBe(output.query);
            // Every evaluator scored this run, each in its own evaluation trace.
            expect(new Set(exampleScores.map((each) => each.evaluator.name))).toEqual(
              new Set(evaluatorsByName.keys())
            );
            for (const exampleScore of exampleScores) {
              const {
                name: evaluatorName,
                kind,
                direction,
                trace_id: evaluatorTraceId,
              } = exampleScore.evaluator;
              const registered = evaluatorsByName.get(evaluatorName);
              expect(kind).toBe(registered?.kind.toLowerCase());
              expect(direction).toBe(registered?.direction);
              expect(evaluatorTraceId).not.toBe(output.traceId);
              const { score: judgeScore } = exampleScore.evaluator;
              if (judgeScore === null || judgeScore === undefined) continue;
              // Quality judges emit a normalized [0, 1] score, or null when a dimension does not
              // apply; efficiency and recall measures are raw non-negative counts or durations.
              expect(judgeScore).toBeGreaterThanOrEqual(0);
              if (registered?.direction === 'maximize') expect(judgeScore).toBeLessThanOrEqual(1);
            }

            log.info(
              JSON.stringify({
                experiment_id: experiment.id,
                dataset_id: experiment.datasetId,
                example_index: run.exampleIndex,
                case_id: output.case_id,
                investigation_id: output.investigation_id,
                conversation_id: output.conversation_id,
                trace_id: output.traceId,
                scores: Object.fromEntries(
                  exampleScores.map((each) => [each.evaluator.name, each.evaluator.score])
                ),
              })
            );
          },
          { concurrency }
        );
        if (orca) {
          // No ORCA rows anywhere means the connector or source is misconfigured, not that the agent
          // investigated poorly.
          expect(
            casesWithOrcaTelemetry.length,
            'No ORCA investigation returned telemetry through the sandbox ORCA connector'
          ).toBeGreaterThan(0);
          log.info(
            `${casesWithOrcaTelemetry.length} of ${runs.length} ORCA investigations returned ORCA telemetry`
          );
        }

        const evaluatorTraces = experiment.evaluationRuns
          .map(({ traceId }) => traceId)
          .filter((traceId): traceId is string => Boolean(traceId));
        expect(experiment.evaluationRuns).toHaveLength(runs.length * scoresPerRun);
        expect(
          experiment.evaluationRuns.every(
            (evaluationRun) => evaluationRun.kind === evaluatorsByName.get(evaluationRun.name)?.kind
          )
        ).toBe(true);
        expect(evaluatorTraces).toHaveLength(runs.length * scoresPerRun);
        // We do NOT require every evaluator trace to be present in traces-*: a judge that resolves via
        // its fast rule-based path never calls the evaluation model (rca_anti_leakage on clean cases,
        // and goal_pass/rca_cause_completeness abstain when an example has no reference answer), so those
        // runs emit only a bare evaluator root span with no searchable inference child. Naming judge roots
        // `judge · <name>` only clears the Tracing UI's EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS filter; this
        // assertion reads traces-* directly, so span naming does not make a childless root discoverable.
        //
        // The model-calling judges wrap `inferenceClient.prompt` in `withActiveInferenceSpan` (see
        // judges/index.ts), which emits an inference-scoped CHAIN span parented onto the judge's
        // `judge · <name>` evaluator trace (root span from `withEvaluatorSpan`, kbn-evals
        // src/utils/tracing.ts). That CHAIN span is exported to traces-* carrying
        // `attributes.elastic.inference.span.kind: "CHAIN"` (see ElasticGenAIAttributes.InferenceSpanKind).
        // We assert at least one such span exists within the evaluator traces: this proves the judges
        // actually ran the evaluation model and that their traces are persisted/viewable, and it still
        // fails if no judge ever calls the model or the judge inference spans are not traced. goal_pass and
        // rca_cause_completeness call the judge whenever a reference answer exists; rca_anti_leakage may
        // short-circuit its clean cases without a model call (hence "at least one", not "every judge").
        //
        // The stronger assertion on judge `gen_ai` message content (attributes.gen_ai.input.messages) is
        // deferred to issue #293725: that content lives on a server-side chat span that is not currently
        // exported to nor correlated with the worker-side evaluator trace. This asserts the judge
        // evaluator + inference spans that ARE exported today.
        await expect
          .poll(
            async () =>
              (
                await traceEsClient.count({
                  index: 'traces-*',
                  query: {
                    bool: {
                      filter: [
                        { terms: { 'trace.id': evaluatorTraces } },
                        { term: { 'attributes.elastic.inference.span.kind': 'CHAIN' } },
                      ],
                    },
                  },
                })
              ).count,
            { timeout: 60_000 }
          )
          .toBeGreaterThan(0);
      }
    );
  });
};
