/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EVALS_SCORES_URL,
  EVALS_EXPERIMENTS_URL,
  EVALS_EXPERIMENT_URL,
  EVALS_EXPERIMENT_SCORES_URL,
  EVALS_EXPERIMENT_RUNS_URL,
  EVALS_EXPERIMENT_TRACES_URL,
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL,
  EVALS_EXPERIMENTS_COMPARE_URL,
  EVALS_EXAMPLE_SCORES_URL,
  EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH,
  EvaluationIndices,
  type CompareExperimentsResponse,
  type GetEvaluationExperimentExampleDetailsResponse,
  type GetEvaluationExperimentResponse,
  type GetEvaluationExperimentScoresResponse,
  type GetEvaluationExperimentRunsResponse,
  type GetEvaluationExperimentTracesResponse,
  type GetEvaluationExperimentDatasetExamplesResponse,
  type GetEvaluationExperimentsResponse,
  type GetExampleScoresResponse,
} from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { buildScore, buildScoresRequestBody, seedTrace, uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');
  const spaces = getService('spaces');
  const log = getService('log');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  describe('Evals - Experiments', function () {
    const suiteId = `ftr-experiments-${uniqueSuffix()}`;
    const baselineExperimentId = `experiment-baseline-${suiteId}`;
    const targetExperimentId = `experiment-target-${suiteId}`;
    const largePayloadExperimentId = `experiment-large-payload-${suiteId}`;
    const datasetId = `dataset-${suiteId}`;
    const datasetName = `Dataset ${suiteId}`;
    const evaluatorName = 'correctness';
    const exampleIds = ['example-1', 'example-2', 'example-3'];
    const largePayloadExampleId = 'large-example';
    const largePayloadSize = 8192;
    const createLargePayload = (sentinel: string) =>
      `${sentinel}${'x'.repeat(largePayloadSize - sentinel.length)}`;
    const largeInputSentinel = `large-input-${suiteId}`;
    const largeOutputSentinel = `large-output-${suiteId}`;
    const largeEvaluatorMetadataSentinel = `large-evaluator-metadata-${suiteId}`;
    const largeInputPayload = createLargePayload(largeInputSentinel);
    const largeOutputPayload = createLargePayload(largeOutputSentinel);
    const largeEvaluatorMetadataPayload = createLargePayload(largeEvaluatorMetadataSentinel);
    const largeInput = { payload: largeInputPayload };
    const largeOutput = { payload: largeOutputPayload };
    const responseSizes: Record<'default' | 'preview' | 'detail', number> = {
      default: 0,
      preview: 0,
      detail: 0,
    };

    // A third experiment with two evaluators per example (an LLM judge and a code evaluator)
    // and task/evaluator trace references, for the runs, traces, and evaluator inventory cases.
    // Its first example is also run a second time (repetition 1, untraced), so the runs
    // endpoint's example x repetition grouping is exercised against real aggregations.
    const tracedExperimentId = `experiment-traced-${suiteId}`;
    const repeatedExampleId = exampleIds[0];
    const repeatedRunOutput = { answer: `answer-${repeatedExampleId}-repetition-1` };
    const codeEvaluatorName = 'latency';
    const judgeModel = { id: 'gpt-4o', family: 'gpt-4', provider: 'openai' };
    const traceIndex = `traces-evals-ftr-experiments-${suiteId}`;
    const taskTraceId = (index: number) => `task-trace-${suiteId}-${index}`;
    const evaluatorTraceId = (index: number) => `evaluator-trace-${suiteId}-${index}`;

    const experimentPath = (experimentId: string) =>
      EVALS_EXPERIMENT_URL.replace('{experimentId}', encodeURIComponent(experimentId));
    const runsPath = (experimentId: string) =>
      EVALS_EXPERIMENT_RUNS_URL.replace('{experimentId}', encodeURIComponent(experimentId));
    const tracesPath = (experimentId: string) =>
      EVALS_EXPERIMENT_TRACES_URL.replace('{experimentId}', encodeURIComponent(experimentId));

    const datasetExamplesPath = (experimentId: string) =>
      EVALS_EXPERIMENT_DATASET_EXAMPLES_URL.replace(
        '{experimentId}',
        encodeURIComponent(experimentId)
      ).replace('{datasetId}', encodeURIComponent(datasetId));

    const exampleDetailsPath = (experimentId: string, exampleId: string) =>
      EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL.replace(
        '{experimentId}',
        encodeURIComponent(experimentId)
      )
        .replace('{datasetId}', encodeURIComponent(datasetId))
        .replace('{exampleId}', encodeURIComponent(exampleId))
        .replace('{repetitionIndex}', '0');

    const ingest = async (experimentId: string, scoresByExample: number[]) => {
      const body = buildScoresRequestBody({
        experimentId,
        suiteId,
        scores: exampleIds.map((exampleId, index) =>
          buildScore({
            exampleId,
            exampleIndex: index,
            datasetId,
            datasetName,
            evaluatorName,
            score: scoresByExample[index],
          })
        ),
      });
      await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);
    };

    const ingestLargePayloadExperiment = async () => {
      const body = buildScoresRequestBody({
        experimentId: largePayloadExperimentId,
        suiteId,
        scores: [evaluatorName, 'relevance'].map((largePayloadEvaluatorName) => {
          const score = buildScore({
            exampleId: largePayloadExampleId,
            exampleIndex: 0,
            datasetId,
            datasetName,
            evaluatorName: largePayloadEvaluatorName,
            score: largePayloadEvaluatorName === evaluatorName ? 1 : 0.75,
          });

          return {
            ...score,
            example: {
              ...score.example,
              input: largeInput,
            },
            task: {
              ...score.task,
              output: largeOutput,
            },
            evaluator: {
              ...score.evaluator,
              metadata: { payload: largeEvaluatorMetadataPayload },
            },
          };
        }),
      });
      await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);
    };

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');
      await ingest(baselineExperimentId, [1, 0.5, 0]);
      await ingest(targetExperimentId, [0.8, 0.6, 0.4]);

      await adminClient
        .post(EVALS_SCORES_URL)
        .send(
          buildScoresRequestBody({
            experimentId: tracedExperimentId,
            suiteId,
            scores: exampleIds.flatMap((exampleId, index) => [
              buildScore({
                exampleId,
                exampleIndex: index,
                datasetId,
                datasetName,
                evaluatorName,
                evaluatorVersion: '2',
                evaluatorKind: 'llm',
                evaluatorModel: judgeModel,
                traceId: taskTraceId(index),
                evaluatorTraceId: evaluatorTraceId(index),
                score: 1,
              }),
              buildScore({
                exampleId,
                exampleIndex: index,
                datasetId,
                datasetName,
                evaluatorName: codeEvaluatorName,
                evaluatorKind: 'code',
                // A stray model on a code evaluator must never be reported.
                evaluatorModel: judgeModel,
                traceId: taskTraceId(index),
                score: 0.5,
              }),
            ]),
          })
        )
        .expect(200);

      await adminClient
        .post(EVALS_SCORES_URL)
        .send(
          buildScoresRequestBody({
            experimentId: tracedExperimentId,
            suiteId,
            scores: [
              {
                evaluatorName,
                evaluatorVersion: '2',
                evaluatorKind: 'llm' as const,
                evaluatorModel: judgeModel,
                score: 0,
              },
              {
                evaluatorName: codeEvaluatorName,
                evaluatorKind: 'code' as const,
                evaluatorModel: judgeModel,
                score: 0.25,
              },
            ].map((evaluator) => {
              const score = buildScore({
                exampleId: repeatedExampleId,
                exampleIndex: 0,
                datasetId,
                datasetName,
                repetitionIndex: 1,
                ...evaluator,
              });
              return { ...score, task: { ...score.task, output: repeatedRunOutput } };
            }),
          })
        )
        .expect(200);

      // Only the first task trace has spans; the other references have "aged out".
      await seedTrace(es, traceIndex, taskTraceId(0), [
        {
          spanId: 'span-1',
          name: 'root span',
          timestamp: '2024-01-01T00:00:00.000Z',
          durationNanos: 5_000_000,
        },
        {
          spanId: 'span-2',
          parentSpanId: 'span-1',
          name: 'child span',
          timestamp: '2024-01-01T00:00:00.002Z',
          durationNanos: 1_000_000,
        },
      ]);
      await ingestLargePayloadExperiment();
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
      await es.indices.delete({ index: traceIndex }).catch(() => {
        // best-effort cleanup
      });
      await es
        .deleteByQuery({
          index: EvaluationIndices.SCORES,
          query: { term: { 'metadata.suite_id': suiteId } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
        .catch(() => {
          // best-effort cleanup
        });
      log.info(
        `Evals example payload response sizes (bytes): default=${responseSizes.default}, preview=${responseSizes.preview}, detail=${responseSizes.detail}`
      );
    });

    describe('listing', () => {
      it('lists the experiments belonging to a suite', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId })
          .expect(200);

        const listing = body as GetEvaluationExperimentsResponse;
        expect(listing.total).to.eql(4);
        const ids = listing.experiments.map((experiment) => experiment.experiment_id).sort();
        expect(ids).to.eql(
          [
            baselineExperimentId,
            targetExperimentId,
            tracedExperimentId,
            largePayloadExperimentId,
          ].sort()
        );
      });

      it('honours pagination parameters', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId, page: 1, per_page: 1 })
          .expect(200);

        const listing = body as GetEvaluationExperimentsResponse;
        expect(listing.total).to.eql(4);
        expect(listing.experiments.length).to.eql(1);
      });

      it('allows listing experiments with read_evals (viewer)', async () => {
        const { body } = await viewerClient
          .get(EVALS_EXPERIMENTS_URL)
          .query({ suite_id: suiteId })
          .expect(200);

        expect((body as GetEvaluationExperimentsResponse).total).to.eql(4);
      });
    });

    describe('detail', () => {
      it('returns experiment metadata with per-evaluator stats', async () => {
        const { body } = await adminClient.get(experimentPath(baselineExperimentId)).expect(200);

        const detail = body as GetEvaluationExperimentResponse;
        expect(detail.experiment_id).to.eql(baselineExperimentId);
        expect(detail.suite_id).to.eql(suiteId);
        expect(detail.task_model).to.not.be(undefined);

        const evaluatorStats = detail.stats.find(
          (stat) => stat.evaluator_name === evaluatorName && stat.dataset_id === datasetId
        );
        expect(evaluatorStats).to.not.be(undefined);
        expect(evaluatorStats?.stats.count).to.eql(3);
        expect(evaluatorStats?.stats.min).to.eql(0);
        expect(evaluatorStats?.stats.max).to.eql(1);
      });

      it('lists every evaluator with its kind, version, and judge model, plus the execution summary', async () => {
        const { body } = await adminClient.get(experimentPath(tracedExperimentId)).expect(200);

        const detail = body as GetEvaluationExperimentResponse;
        expect(detail.hostname).to.eql('ftr-host');
        expect(typeof detail.first_score_at).to.be('string');
        expect(typeof detail.last_score_at).to.be('string');

        const judge = detail.evaluators?.find((evaluator) => evaluator.name === evaluatorName);
        expect(judge).to.eql({
          name: evaluatorName,
          version: '2',
          kind: 'llm',
          model: judgeModel,
          score_count: 4,
        });

        // The code evaluator's stray model is withheld, in the inventory and in the stats.
        const code = detail.evaluators?.find((evaluator) => evaluator.name === codeEvaluatorName);
        expect(code).to.eql({ name: codeEvaluatorName, kind: 'code', score_count: 4 });
        const codeStats = detail.stats.find((stat) => stat.evaluator_name === codeEvaluatorName);
        expect(codeStats?.evaluator_model).to.be(undefined);
      });

      it('returns 404 for an unknown experiment', async () => {
        await adminClient.get(experimentPath(`missing-${suiteId}`)).expect(404);
      });
    });

    describe('runs', () => {
      it('groups every evaluator result under its example x repetition, in example order', async () => {
        const { body } = await adminClient
          .get(runsPath(tracedExperimentId))
          .query({ page: 1, per_page: 2 })
          .expect(200);

        const response = body as GetEvaluationExperimentRunsResponse;
        expect(response.experiment_id).to.eql(tracedExperimentId);
        expect(response.total).to.eql(4);
        expect(response.page).to.eql(1);
        expect(response.per_page).to.eql(2);
        // Both repetitions of the first example come before the second example.
        expect(response.runs.map((run) => [run.example.id, run.task.repetition_index])).to.eql([
          [repeatedExampleId, 0],
          [repeatedExampleId, 1],
        ]);

        const [first, second] = response.runs;
        expect(first.example.index).to.eql(0);
        expect(first.example.input).to.eql({ question: `question-${exampleIds[0]}` });
        expect(first.task.repetition_index).to.eql(0);
        expect(first.task.output).to.eql({ answer: `answer-${exampleIds[0]}` });
        expect(first.task.trace_id).to.eql(taskTraceId(0));
        expect(first.evaluators.map((evaluator) => evaluator.name)).to.eql([
          evaluatorName,
          codeEvaluatorName,
        ]);

        const judge = first.evaluators.find((evaluator) => evaluator.name === evaluatorName);
        expect(judge?.kind).to.eql('llm');
        expect(judge?.model).to.eql(judgeModel);
        expect(judge?.trace_id).to.eql(evaluatorTraceId(0));

        const code = first.evaluators.find((evaluator) => evaluator.name === codeEvaluatorName);
        expect(code?.kind).to.eql('code');
        expect(code?.model).to.be(undefined);

        // The second repetition is a distinct run with its own output and scores,
        // not merged into the first one.
        expect(second.example.index).to.eql(0);
        expect(second.task.repetition_index).to.eql(1);
        expect(second.task.output).to.eql(repeatedRunOutput);
        expect(second.task.trace_id).to.be(undefined);
        expect(second.evaluators.map((evaluator) => [evaluator.name, evaluator.score])).to.eql([
          [evaluatorName, 0],
          [codeEvaluatorName, 0.25],
        ]);
      });

      it('returns the remaining runs on the last page', async () => {
        const { body } = await adminClient
          .get(runsPath(tracedExperimentId))
          .query({ page: 2, per_page: 2 })
          .expect(200);

        const response = body as GetEvaluationExperimentRunsResponse;
        expect(response.total).to.eql(4);
        expect(response.runs.map((run) => run.example.id)).to.eql(exampleIds.slice(1, 3));
      });

      it('returns an empty page past the last run while keeping the total', async () => {
        const { body } = await adminClient
          .get(runsPath(tracedExperimentId))
          .query({ page: 5, per_page: 2 })
          .expect(200);

        const response = body as GetEvaluationExperimentRunsResponse;
        expect(response.total).to.eql(4);
        expect(response.runs).to.eql([]);
      });

      it('returns 404 for an unknown experiment', async () => {
        await adminClient.get(runsPath(`missing-${suiteId}`)).expect(404);
      });

      it('allows reading runs with read_evals (viewer)', async () => {
        const { body } = await viewerClient.get(runsPath(baselineExperimentId)).expect(200);
        expect((body as GetEvaluationExperimentRunsResponse).total).to.eql(3);
      });
    });

    describe('traces', () => {
      it('resolves task and evaluator traces through the score documents, task traces first', async () => {
        const { body } = await adminClient.get(tracesPath(tracedExperimentId)).expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.experiment_id).to.eql(tracedExperimentId);
        expect(response.total).to.eql(6);
        expect(response.traces.map((trace) => trace.role)).to.eql([
          'task',
          'task',
          'task',
          'evaluator',
          'evaluator',
          'evaluator',
        ]);
        expect(response.traces.map((trace) => trace.trace_id)).to.eql([
          taskTraceId(0),
          taskTraceId(1),
          taskTraceId(2),
          evaluatorTraceId(0),
          evaluatorTraceId(1),
          evaluatorTraceId(2),
        ]);
        expect(response.traces[3].evaluator_name).to.eql(evaluatorName);

        // The seeded trace carries its spans; the other references keep empty spans.
        const [seeded, expired] = response.traces;
        expect(seeded.total_spans).to.eql(2);
        expect(seeded.spans.map((span) => span.span_id)).to.eql(['span-1', 'span-2']);
        expect(seeded.duration_ms).to.eql(5);
        expect(expired.total_spans).to.eql(0);
        expect(expired.spans).to.eql([]);
        expect(expired.duration_ms).to.eql(0);
      });

      it('returns only task traces for role=task', async () => {
        const { body } = await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ role: 'task' })
          .expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.total).to.eql(3);
        expect(response.traces.every((trace) => trace.role === 'task')).to.be(true);
      });

      it('restricts evaluator traces to the named evaluator', async () => {
        const { body } = await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ role: 'evaluator', evaluator: evaluatorName })
          .expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.total).to.eql(3);
        expect(
          response.traces.every(
            (trace) => trace.role === 'evaluator' && trace.evaluator_name === evaluatorName
          )
        ).to.be(true);
      });

      it('returns an empty page for an evaluator that scored the experiment without traces', async () => {
        const { body } = await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ role: 'evaluator', evaluator: codeEvaluatorName })
          .expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.total).to.eql(0);
        expect(response.traces).to.eql([]);
      });

      it('paginates by trace', async () => {
        const { body } = await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ page: 2, per_page: 4 })
          .expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.total).to.eql(6);
        expect(response.traces.map((trace) => trace.trace_id)).to.eql([
          evaluatorTraceId(1),
          evaluatorTraceId(2),
        ]);
      });

      it('returns an empty page for an experiment that recorded no trace references', async () => {
        const { body } = await adminClient.get(tracesPath(baselineExperimentId)).expect(200);

        const response = body as GetEvaluationExperimentTracesResponse;
        expect(response.total).to.eql(0);
        expect(response.traces).to.eql([]);
      });

      it('rejects the evaluator filter without role=evaluator', async () => {
        await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ evaluator: evaluatorName })
          .expect(400);
      });

      it('returns 404 for an unknown experiment or evaluator', async () => {
        await adminClient.get(tracesPath(`missing-${suiteId}`)).expect(404);
        await adminClient
          .get(tracesPath(tracedExperimentId))
          .query({ role: 'evaluator', evaluator: `missing-${suiteId}` })
          .expect(404);
      });

      it('allows reading traces with read_evals (viewer)', async () => {
        await viewerClient.get(tracesPath(tracedExperimentId)).expect(200);
      });
    });

    describe('spaces', () => {
      const spaceId = `evals-experiments-${suiteId}`;
      const inSpace = (path: string) => `/s/${spaceId}${path}`;

      before(async () => {
        await spaces.create({ id: spaceId, name: 'Evals Experiments Space', disabledFeatures: [] });
      });

      after(async () => {
        await spaces.delete(spaceId);
      });

      it('keeps an experiment ingested in the default space out of another space', async () => {
        await adminClient.get(inSpace(experimentPath(tracedExperimentId))).expect(404);
        await adminClient.get(inSpace(runsPath(tracedExperimentId))).expect(404);
        await adminClient.get(inSpace(tracesPath(tracedExperimentId))).expect(404);
      });
    });

    describe('scores', () => {
      it('returns every score document for an experiment', async () => {
        const path = EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(baselineExperimentId)
        );
        const { body } = await adminClient.get(path).expect(200);

        const scoresResponse = body as GetEvaluationExperimentScoresResponse;
        expect(scoresResponse.total).to.eql(3);
        expect(
          scoresResponse.scores.every((score) => score.experiment_id === baselineExperimentId)
        ).to.be(true);
      });

      it('excludes the unbounded task.output/example.input/example.metadata/evaluator.metadata fields', async () => {
        const largeFieldsExperimentId = `experiment-large-fields-${suiteId}`;
        const body = buildScoresRequestBody({
          experimentId: largeFieldsExperimentId,
          suiteId,
          scores: [
            {
              example: {
                id: 'example-large-fields',
                index: 0,
                input: { rawHits: 'x'.repeat(1000) },
                metadata: { rawHits: 'x'.repeat(1000) },
                dataset: { id: datasetId, name: datasetName },
              },
              task: {
                repetition_index: 0,
                output: { rawHits: 'x'.repeat(1000) },
              },
              evaluator: {
                name: evaluatorName,
                score: 1,
                label: 'correct',
                explanation: 'seeded for unbounded-field exclusion test',
                metadata: { rationale: 'x'.repeat(1000) },
              },
            },
          ],
        });
        await adminClient.post(EVALS_SCORES_URL).send(body).expect(200);

        const path = EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(largeFieldsExperimentId)
        );
        const { body: responseBody } = await adminClient.get(path).expect(200);

        const scoresResponse = responseBody as GetEvaluationExperimentScoresResponse;
        expect(scoresResponse.total).to.eql(1);
        const [score] = scoresResponse.scores;
        expect(score.experiment_id).to.eql(largeFieldsExperimentId);
        expect(score.evaluator.score).to.eql(1);
        expect(score.evaluator.name).to.eql(evaluatorName);
        expect(score.task.output).to.be(undefined);
        expect(score.example.input).to.be(undefined);
        expect(score.example.metadata).to.be(undefined);
        expect(score.evaluator.metadata).to.be(undefined);
      });
    });

    describe('dataset examples', () => {
      it('groups an experiment scores by example for a dataset', async () => {
        const { body } = await adminClient
          .get(datasetExamplesPath(baselineExperimentId))
          .expect(200);

        const examplesResponse = body as GetEvaluationExperimentDatasetExamplesResponse;
        expect(Object.keys(examplesResponse)).to.eql(['examples']);
        expect(examplesResponse.examples.length).to.eql(3);
        expect(examplesResponse.examples.map((example) => example.example_id).sort()).to.eql(
          [...exampleIds].sort()
        );
        expect(examplesResponse.examples.every((example) => example.scores.length >= 1)).to.be(
          true
        );
        expect(examplesResponse.examples.every((example) => example.previews === undefined)).to.be(
          true
        );
      });

      it('omits complete input and output while retaining eager evaluator details', async () => {
        const { body } = await adminClient
          .get(datasetExamplesPath(largePayloadExperimentId))
          .expect(200);

        const examplesResponse = body as GetEvaluationExperimentDatasetExamplesResponse;
        responseSizes.default = Buffer.byteLength(JSON.stringify(examplesResponse));
        expect(Object.keys(examplesResponse)).to.eql(['examples']);
        expect(examplesResponse.examples.length).to.eql(1);

        const [example] = examplesResponse.examples;
        expect(example.example_id).to.eql(largePayloadExampleId);
        expect(example.previews).to.be(undefined);
        expect(example.scores.length).to.eql(2);
        expect(
          example.scores.every(
            (score) =>
              score.example.input === undefined &&
              score.task.output === undefined &&
              score.evaluator.explanation === 'seeded by FTR' &&
              score.evaluator.metadata?.payload === largeEvaluatorMetadataPayload
          )
        ).to.be(true);

        const defaultResponse = JSON.stringify(examplesResponse);
        expect(defaultResponse).to.not.contain(largeInputSentinel);
        expect(defaultResponse).to.not.contain(largeOutputSentinel);
        expect(defaultResponse).to.contain(largeEvaluatorMetadataSentinel);
        expect(defaultResponse.split(largeEvaluatorMetadataPayload).length - 1).to.eql(2);
      });

      it('returns bounded input and output previews', async () => {
        const { body } = await adminClient
          .get(datasetExamplesPath(largePayloadExperimentId))
          .query({ include_previews: true })
          .expect(200);

        const previewResponse = body as GetEvaluationExperimentDatasetExamplesResponse;
        responseSizes.preview = Buffer.byteLength(JSON.stringify(previewResponse));
        expect(Object.keys(previewResponse)).to.eql(['examples']);
        expect(previewResponse.examples.length).to.eql(1);

        const serializedInput = JSON.stringify(largeInput);
        const serializedOutput = JSON.stringify(largeOutput);
        const [example] = previewResponse.examples;
        expect(example.previews).to.eql([
          {
            repetition_index: 0,
            input: {
              content: serializedInput.slice(0, EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH),
              truncated: true,
            },
            output: {
              content: serializedOutput.slice(0, EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH),
              truncated: true,
            },
          },
        ]);

        const serializedPreviewResponse = JSON.stringify(previewResponse);
        expect(serializedPreviewResponse).to.contain(largeInputSentinel);
        expect(serializedPreviewResponse).to.contain(largeOutputSentinel);
        expect(serializedPreviewResponse).to.not.contain(largeInputPayload);
        expect(serializedPreviewResponse).to.not.contain(largeOutputPayload);
      });

      it('returns one complete example repetition without evaluator details', async () => {
        const { body } = await adminClient
          .get(exampleDetailsPath(largePayloadExperimentId, largePayloadExampleId))
          .expect(200);

        const details = body as GetEvaluationExperimentExampleDetailsResponse;
        responseSizes.detail = Buffer.byteLength(JSON.stringify(details));
        expect(Object.keys(details).sort()).to.eql(['example', 'task']);
        expect(Object.keys(details.example)).to.eql(['input']);
        expect(Object.keys(details.task)).to.eql(['output']);
        expect(details.example.input).to.eql(largeInput);
        expect(details.task.output).to.eql(largeOutput);

        const detailResponse = JSON.stringify(details);
        expect(detailResponse.split(largeInputPayload).length - 1).to.eql(1);
        expect(detailResponse.split(largeOutputPayload).length - 1).to.eql(1);
        expect(detailResponse).to.not.contain(largeEvaluatorMetadataSentinel);
      });
    });

    describe('compare', () => {
      it('runs a paired comparison over the shared dataset examples', async () => {
        const { body } = await adminClient
          .get(EVALS_EXPERIMENTS_COMPARE_URL)
          .query({
            type: 'experiment',
            baseline_id: baselineExperimentId,
            target_id: targetExperimentId,
          })
          .expect(200);

        const comparison = body as CompareExperimentsResponse;
        expect(comparison.pairing.totalPairs).to.eql(3);
        expect(comparison.results.length).to.be.greaterThan(0);

        const evaluatorResult = comparison.results.find(
          (result) => result.datasetId === datasetId && result.evaluatorName === evaluatorName
        );
        expect(evaluatorResult).to.not.be(undefined);
        expect(evaluatorResult?.sampleSize).to.eql(3);
      });

      it('returns 404 when a compared experiment has no scores', async () => {
        await adminClient
          .get(EVALS_EXPERIMENTS_COMPARE_URL)
          .query({
            type: 'experiment',
            baseline_id: baselineExperimentId,
            target_id: `missing-${suiteId}`,
          })
          .expect(404);
      });
    });

    describe('example scores', () => {
      it('returns the score history for a seeded example id', async () => {
        const path = EVALS_EXAMPLE_SCORES_URL.replace(
          '{exampleId}',
          encodeURIComponent(exampleIds[0])
        );
        const { body } = await adminClient.get(path).expect(200);

        const response = body as GetExampleScoresResponse;
        expect(response.total).to.be.greaterThan(0);
        const experimentIds = response.scores.map((score) => score.experiment_id);
        expect(experimentIds).to.contain(baselineExperimentId);
        expect(experimentIds).to.contain(targetExperimentId);
      });
    });
  });
}
