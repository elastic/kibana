/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { createRestClient } from '@kbn/inference-plugin/common';
import type { EvalConnector } from '@kbn/evals';
import { createOrcaEvaluators } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/judges';
import type { InvestigationTaskOutput } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/types';
import { loadTasks } from './dataset';
import type { LaneSettings } from './paths';
import { createLaneFetch } from './kibana';

interface StoredTrace {
  case_id: string;
  question: string;
  named_flags?: string[];
  scores: {
    reward: number | null;
    orca_rca_accuracy: number | null;
    orca_hallucination: number | null;
  };
  execution_error?: string;
  report?: InvestigationTaskOutput['structured_report'];
}

/**
 * Re-judges stored investigations with the judges as they are on disk now, and prints what moved.
 * The way to check a judge change against real reports without re-running any investigation.
 */
export const rescoreTraces = async ({
  tracePaths,
  lane,
  judgeConnectorId,
  log,
}: {
  tracePaths: string[];
  lane: LaneSettings;
  judgeConnectorId: string;
  log: ToolingLog;
}): Promise<void> => {
  const tasks = new Map(loadTasks().map((task) => [task.caseId, task]));
  const [accuracy, hallucination] = createOrcaEvaluators({
    inferenceClient: createRestClient({
      fetch: createLaneFetch(lane),
      bindTo: { connectorId: judgeConnectorId },
    }),
    evaluationConnector: {
      id: judgeConnectorId,
      name: judgeConnectorId,
    } as unknown as EvalConnector,
    log,
  });
  let changed = 0;
  for (const path of tracePaths) {
    const trace = JSON.parse(Fs.readFileSync(path, 'utf8')) as StoredTrace;
    const task = tasks.get(trace.case_id);
    if (!task || task.control) continue;
    const output: InvestigationTaskOutput = {
      case_id: trace.case_id,
      query: trace.question,
      structured_report: trace.report,
      execution_error: trace.execution_error,
    };
    const params = {
      input: task.example.input,
      output,
      expected: task.example.output,
      metadata: task.example.metadata,
    };
    const [acc, hall] = await Promise.all([
      accuracy.evaluate(params),
      hallucination.evaluate(params),
    ]);
    const named = (acc.metadata as { named_flags?: string[] } | undefined)?.named_flags ?? [];
    const before = `acc ${trace.scores.orca_rca_accuracy} halluc ${
      trace.scores.orca_hallucination
    } named [${(trace.named_flags ?? []).join(', ')}]`;
    const after = `acc ${acc.score} halluc ${hall.score} named [${named.join(', ')}]`;
    const moved =
      acc.score !== trace.scores.orca_rca_accuracy ||
      hall.score !== trace.scores.orca_hallucination;
    if (moved) changed++;
    log.info(
      `${moved ? 'CHANGED' : 'same   '} ${
        trace.case_id
      }\n      file:   ${path}\n      before: ${before}\n      after:  ${after}\n      judge:  ${
        acc.explanation
      }`
    );
  }
  log.info(`[rescore] ${changed} of ${tracePaths.length} traces changed score`);
};
