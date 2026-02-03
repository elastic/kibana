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
  formatReportData,
  type EvaluationReport,
  type EvaluationReporter,
  createTable,
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
        d.evaluatorScores.forEach((_, evaluatorName) => {
          evaluatorNamesSet.add(evaluatorName);
        });
      });

      // Aggregate raw scores from all datasets in this scenario (not used directly in the reports now, but will be when statistcal tests are added)
      const aggregatedScores = new Map<string, number[]>();
      evaluatorNamesSet.forEach((evaluatorName) => {
        const allScores = scenarioDatasets.flatMap(
          (d) => d.evaluatorScores.get(evaluatorName) || []
        );
        aggregatedScores.set(evaluatorName, allScores);
      });

      return {
        id: scenarioName,
        name: scenarioName,
        numExamples: sumBy(scenarioDatasets, (d) => d.numExamples),
        // experimentId is not meaningful for aggregated scenarios (multiple experiments/datasets combined)
        experimentId: '_',
        evaluatorScores: aggregatedScores,
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
): Promise<EvaluationReport> {
  log.info(`Building scenario report for run ID: ${runId}`);

  const docs = await scoreRepository.getScoresByRunId(runId);

  if (!docs || docs.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}`);
  }

  const baseReport = formatReportData(docs);

  const scenarioDatasets = aggregateDatasetsByScenario(baseReport.datasetScoresWithStats, log);

  return {
    ...baseReport,
    datasetScoresWithStats: scenarioDatasets,
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
        `Run: ${chalk.cyan(report.runId)} - Model: ${chalk.yellow(
          report.model.id || 'Unknown'
        )} - Evaluator: ${chalk.yellow(report.evaluatorModel.id || 'Unknown')}`
      );
      if (report.repetitions > 1) {
        log.info(`Repetitions: ${chalk.cyan(report.repetitions.toString())}`);
      }

      log.info(`\n${chalk.bold.blue('═══ SCENARIO SUMMARY ═══')}`);
      const evaluatorDisplayOptions = new Map(
        options.reportDisplayOptions?.evaluatorDisplayOptions || []
      );
      evaluatorDisplayOptions.set('Criteria', {
        decimalPlaces: 1,
        statsToInclude: ['mean', 'percentage', 'stdDev'],
      });
      const scenarioTable = createTable(report.datasetScoresWithStats, report.repetitions, {
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
