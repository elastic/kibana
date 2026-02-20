/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  type EvaluationScoreRepository,
  type EvaluatorStats,
  type ReportDisplayOptions,
  type EvaluationReporter,
  createTable,
} from '@kbn/evals';
import chalk from 'chalk';

/**
 * Extracts scenario name from dataset name using pattern "scenario: dataset-name"
 * Falls back to "Other" if no scenario prefix is found
 */
function extractScenarioName(datasetName: string, log: SomeDevLog): string {
  const match = datasetName.match(/^([^:]+):/);
  if (!match) {
    log.warning(
      `Dataset "${datasetName}" does not match expected "scenario: name" pattern. Grouping under "Other".`
    );
    return 'Other';
  }
  return match[1].trim();
}

/**
 * Aggregates stats by scenario, combining all datasets that belong to the same scenario.
 * Returns a flat EvaluatorStats[] with scenario names as datasetName.
 */
function aggregateStatsByScenario(stats: EvaluatorStats[], log: SomeDevLog): EvaluatorStats[] {
  const scenarioEvaluatorMap = new Map<string, Map<string, EvaluatorStats[]>>();

  stats.forEach((stat) => {
    const scenarioName = extractScenarioName(stat.datasetName, log);

    if (!scenarioEvaluatorMap.has(scenarioName)) {
      scenarioEvaluatorMap.set(scenarioName, new Map());
    }

    const evaluatorMap = scenarioEvaluatorMap.get(scenarioName)!;
    if (!evaluatorMap.has(stat.evaluatorName)) {
      evaluatorMap.set(stat.evaluatorName, []);
    }
    evaluatorMap.get(stat.evaluatorName)!.push(stat);
  });

  const result: EvaluatorStats[] = [];

  scenarioEvaluatorMap.forEach((evaluatorMap, scenarioName) => {
    evaluatorMap.forEach((evaluatorStats, evaluatorName) => {
      const totalCount = evaluatorStats.reduce((sum, s) => sum + s.stats.count, 0);

      if (totalCount === 0) {
        result.push({
          datasetId: scenarioName,
          datasetName: scenarioName,
          evaluatorName,
          stats: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 },
        });
        return;
      }

      const weightedMean =
        evaluatorStats.reduce((sum, s) => sum + s.stats.mean * s.stats.count, 0) / totalCount;

      const pooledVariance =
        totalCount > 1
          ? evaluatorStats.reduce((sum, s) => {
              return (
                sum +
                (s.stats.count - 1) * s.stats.stdDev ** 2 +
                s.stats.count * (s.stats.mean - weightedMean) ** 2
              );
            }, 0) /
            (totalCount - 1)
          : 0;

      result.push({
        datasetId: scenarioName,
        datasetName: scenarioName,
        evaluatorName,
        stats: {
          mean: weightedMean,
          median: weightedMean,
          stdDev: Math.sqrt(pooledVariance),
          min: Math.min(...evaluatorStats.map((s) => s.stats.min)),
          max: Math.max(...evaluatorStats.map((s) => s.stats.max)),
          count: totalCount,
        },
      });
    });
  });

  return result.sort((a, b) => a.datasetName.localeCompare(b.datasetName));
}

/**
 * Builds a scenario-grouped evaluation report from Elasticsearch
 * Aggregates individual datasets into scenario-level synthetic datasets
 */
async function buildScenarioReport(
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog,
  filter?: { taskModelId?: string; suiteId?: string }
): Promise<{
  stats: EvaluatorStats[];
  totalRepetitions: number;
  taskModel: { id?: string; family: string; provider: string };
  evaluatorModel: { id?: string; family: string; provider: string };
}> {
  log.info(`Building scenario report for run ID: ${runId}`);

  const runStats = await scoreRepository.getStatsByRunId(runId, filter);

  if (!runStats || runStats.stats.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}`);
  }

  const scenarioStats = aggregateStatsByScenario(runStats.stats, log);

  return {
    stats: scenarioStats,
    totalRepetitions: runStats.totalRepetitions,
    taskModel: runStats.taskModel,
    evaluatorModel: runStats.evaluatorModel,
  };
}

/**
 * Creates a custom reporter that displays evaluation results grouped by scenario
 * Aggregates individual datasets into scenario-level views for easier analysis
 * Datasets should follow the pattern "scenario: dataset-name" for proper grouping
 */
export function createScenarioSummaryReporter(
  options: { reportDisplayOptions?: ReportDisplayOptions } = {}
): EvaluationReporter {
  return async (
    scoreRepository: EvaluationScoreRepository,
    runId: string,
    log: SomeDevLog,
    filter?: { taskModelId?: string; suiteId?: string }
  ): Promise<void> => {
    try {
      log.info(chalk.bold.blue('\n🔍 === SCENARIO SUMMARY REPORT ==='));

      const report = await buildScenarioReport(scoreRepository, runId, log, filter);

      if (!report.stats || report.stats.length === 0) {
        log.warning('⚠️ No scenarios found to display');
        return;
      }

      log.info(`\n${chalk.bold.blue('📋 Run Metadata:')}`);
      log.info(
        `Run: ${chalk.cyan(runId)} - Model: ${chalk.yellow(
          report.taskModel.id || 'Unknown'
        )} - Evaluator: ${chalk.yellow(report.evaluatorModel.id || 'Unknown')}`
      );
      if (report.totalRepetitions > 1) {
        log.info(`Repetitions: ${chalk.cyan(report.totalRepetitions.toString())}`);
      }

      log.info(`\n${chalk.bold.blue('═══ SCENARIO SUMMARY ═══')}`);
      const evaluatorDisplayOptions = new Map(
        options.reportDisplayOptions?.evaluatorDisplayOptions || []
      );
      evaluatorDisplayOptions.set('Criteria', {
        decimalPlaces: 1,
        statsToInclude: ['mean', 'stdDev'],
      });
      const scenarioTable = createTable(report.stats, report.totalRepetitions, {
        firstColumnHeader: 'Scenario',
        styleRowName: (name) => chalk.bold.white(name),
        evaluatorDisplayOptions,
        evaluatorDisplayGroups: options.reportDisplayOptions?.evaluatorDisplayGroups,
      });
      log.info(`\n${scenarioTable}`);
    } catch (error: any) {
      log.error(`❌ Failed to generate scenario summary report: ${error.message}`);
      throw error;
    }
  };
}
