/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  type EvaluationScoreRepository,
  type DatasetScoreWithStats,
  type ReportDisplayOptions,
  calculateOverallStats,
  type EvaluationReporter,
  createTable,
  convertAggregationToDatasetScores,
} from '@kbn/evals';
import chalk from 'chalk';
import { sumBy } from 'lodash';

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
 * Aggregates multiple datasets into scenario-level synthetic datasets
 * Each returned dataset represents a scenario with aggregated statistics
 */
function aggregateDatasetsByScenario(
  datasets: DatasetScoreWithStats[],
  log: SomeDevLog
): DatasetScoreWithStats[] {
  const scenarioMap = new Map<string, DatasetScoreWithStats[]>();

  datasets.forEach((dataset) => {
    const scenarioName = extractScenarioName(dataset.name, log);
    if (!scenarioMap.has(scenarioName)) {
      scenarioMap.set(scenarioName, []);
    }
    scenarioMap.get(scenarioName)!.push(dataset);
  });

  return Array.from(scenarioMap.entries())
    .map(([scenarioName, scenarioDatasets]) => {
      // Collect unique evaluator names from all datasets in this scenario
      const evaluatorNamesSet = new Set<string>();
      scenarioDatasets.forEach((d) => {
        d.evaluatorStats.forEach((_, evaluatorName) => {
          evaluatorNamesSet.add(evaluatorName);
        });
      });

      return {
        id: scenarioName,
        name: scenarioName,
        numExamples: sumBy(scenarioDatasets, (d) => d.numExamples),
        // experimentId is not meaningful for aggregated scenarios (multiple experiments/datasets combined)
        experimentId: '_',
        evaluatorScores: new Map(),
        evaluatorStats: calculateOverallStats(scenarioDatasets),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Builds a scenario-grouped evaluation report from Elasticsearch
 * Aggregates individual datasets into scenario-level synthetic datasets
 */
async function buildScenarioReport(
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog
): Promise<{
  datasetScoresWithStats: DatasetScoreWithStats[];
  totalRepetitions: number;
  taskModel: { id: string; family: string; provider: string };
  evaluatorModel: { id: string; family: string; provider: string } | null;
}> {
  log.info(`Building scenario report for run ID: ${runId}`);

  const runStats = await scoreRepository.getStatsByRunId(runId);

  if (!runStats || runStats.stats.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}`);
  }

  const baseScores = convertAggregationToDatasetScores(runStats.stats);
  const scenarioDatasets = aggregateDatasetsByScenario(baseScores, log);

  return {
    datasetScoresWithStats: scenarioDatasets,
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
    log: SomeDevLog
  ): Promise<void> => {
    try {
      log.info(chalk.bold.blue('\n🔍 === SCENARIO SUMMARY REPORT ==='));

      const report = await buildScenarioReport(scoreRepository, runId, log);

      if (!report.datasetScoresWithStats || report.datasetScoresWithStats.length === 0) {
        log.warning('⚠️ No scenarios found to display');
        return;
      }

      log.info(`\n${chalk.bold.blue('📋 Run Metadata:')}`);
      log.info(
        `Run: ${chalk.cyan(runId)} - Model: ${chalk.yellow(
          report.taskModel.id || 'Unknown'
        )} - Evaluator: ${chalk.yellow(report.evaluatorModel?.id || 'Unknown')}`
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
        statsToInclude: ['mean', 'percentage', 'stdDev'],
      });
      const scenarioTable = createTable(report.datasetScoresWithStats, report.totalRepetitions, {
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
