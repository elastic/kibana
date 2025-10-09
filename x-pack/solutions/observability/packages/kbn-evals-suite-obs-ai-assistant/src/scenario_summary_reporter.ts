/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  type EvaluationReporter,
  type EvaluationScoreRepository,
  type EvaluatorStats,
  type DatasetScoreWithStats,
  formatStatsCell,
  buildColumnAlignment,
  calculateOverallStats,
  convertScoreDocsToDatasets,
} from '@kbn/evals';
import { table } from 'table';
import chalk from 'chalk';
import { sumBy } from 'lodash';

interface ScenarioInfo {
  name: string;
  datasets: DatasetScoreWithStats[];
  overallStats: Map<string, EvaluatorStats>;
}

/**
 * Extracts scenario name from dataset name using pattern "scenario: dataset-name"
 * Falls back to "Other" if no scenario prefix is found
 */
function extractScenarioName(datasetName: string): string {
  const match = datasetName.match(/^([^:]+):/);
  return match ? match[1].trim() : 'Other';
}

/**
 * Groups datasets by scenario prefix and returns sorted scenario groups with stats
 */
function groupDatasetsByScenario(
  datasets: DatasetScoreWithStats[],
  evaluatorNames: string[]
): ScenarioInfo[] {
  const scenarioMap = new Map<string, DatasetScoreWithStats[]>();

  datasets.forEach((dataset) => {
    const scenarioName = extractScenarioName(dataset.name);
    if (!scenarioMap.has(scenarioName)) {
      scenarioMap.set(scenarioName, []);
    }
    scenarioMap.get(scenarioName)!.push(dataset);
  });

  return Array.from(scenarioMap.entries())
    .map(([scenarioName, scenarioDatasets]) => ({
      name: scenarioName,
      datasets: scenarioDatasets,
      // Calculate overall stats for this scenario's datasets
      overallStats: calculateOverallStats(scenarioDatasets, evaluatorNames),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates a formatted table displaying scenario evaluation statistics.
 */
function createScenarioSummaryTable(
  scenarios: ScenarioInfo[],
  evaluatorNames: string[],
  totalExamples: number
): string {
  const headers = ['Scenario', '# Examples', ...evaluatorNames];

  const scenarioRows = scenarios.map((scenario) => {
    const scenarioTotalExamples = sumBy(scenario.datasets, (d) => d.numExamples);
    const row = [chalk.bold.white(scenario.name), scenarioTotalExamples.toString()];

    evaluatorNames.forEach((evaluatorName) => {
      const stats = scenario.overallStats.get(evaluatorName);
      if (stats && stats.count > 0) {
        // Use shared formatter - only display percentage, mean, and stdDev
        const cellContent = formatStatsCell({
          percentage: stats.percentage,
          mean: stats.mean,
          stdDev: stats.stdDev,
        });
        row.push(cellContent);
      } else {
        row.push(chalk.gray('-'));
      }
    });

    return row;
  });

  // Calculate overall statistics across all datasets in all scenarios
  const allDatasets = scenarios.flatMap((scenario) => scenario.datasets);
  const overallStats = calculateOverallStats(allDatasets, evaluatorNames);
  const overallRow = [chalk.bold.green('Overall'), chalk.bold.green(totalExamples.toString())];

  evaluatorNames.forEach((evaluatorName) => {
    const stats = overallStats.get(evaluatorName);
    if (stats) {
      const cellContent = formatStatsCell(
        {
          percentage: stats.percentage,
          mean: stats.mean,
          stdDev: stats.stdDev,
        },
        true
      );
      overallRow.push(cellContent);
    } else {
      overallRow.push(chalk.bold.green('-'));
    }
  });

  const columnConfig = buildColumnAlignment(headers.length);

  return table([headers, ...scenarioRows, overallRow], {
    columns: columnConfig,
  });
}

/**
 * Retrieves evaluation scores and groups them by scenario.
 * Scenarios are extracted from dataset names using the pattern "scenario: dataset-name".
 */
async function getScoresByScenario(
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog
): Promise<{ scenarios: ScenarioInfo[]; evaluatorNames: string[]; metadata: any }> {
  log.info(`Retrieving scores for run ID: ${runId} and grouping by scenario`);

  const scores = await scoreRepository.getScoresByRunId(runId);

  if (!scores || scores.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}`);
  }

  // Convert ES documents to DatasetScoreWithStats using shared logic
  const datasets = convertScoreDocsToDatasets(scores);

  // Extract evaluator names
  const evaluatorNames = Array.from(
    new Set(scores.map((score: any) => score.evaluator.name))
  ).sort();

  // Group datasets by scenario and calculate per-scenario stats
  const scenarios = groupDatasetsByScenario(datasets, evaluatorNames);

  return {
    scenarios,
    evaluatorNames,
    metadata: {
      runId,
      timestamp: scores[0]?.['@timestamp'],
      model: scores[0]?.model.id,
    },
  };
}

/**
 * Creates a custom reporter that displays evaluation results grouped by scenario.
 * This is specific to Observability AI Assistant where datasets follow the pattern "scenario: dataset-name".
 */
export function createScenarioSummaryReporter(): EvaluationReporter {
  return async (
    scoreRepository: EvaluationScoreRepository,
    runId: string,
    log: SomeDevLog
  ): Promise<void> => {
    try {
      log.info(chalk.bold.blue('\n🔍 === SCENARIO SUMMARY REPORT ==='));

      const { scenarios, evaluatorNames, metadata } = await getScoresByScenario(
        scoreRepository,
        runId,
        log
      );

      if (!scenarios || scenarios.length === 0) {
        log.warning('⚠️ No scenarios found to display');
        return;
      }

      // Display metadata
      log.info(`\n${chalk.bold.blue('📋 Run Metadata:')}`);
      log.info(
        `Run: ${chalk.cyan(metadata.runId)} (${
          metadata.timestamp || 'Unknown time'
        }) - Model: ${chalk.yellow(metadata.model || 'Unknown')}`
      );

      // Calculate total examples
      const totalExamples = sumBy(
        scenarios.flatMap((scenario) => scenario.datasets),
        (dataset) => dataset.numExamples
      );

      // Display scenario summary table
      log.info(`\n${chalk.bold.blue('═══ SCENARIO SUMMARY ═══')}`);
      const scenarioTable = createScenarioSummaryTable(scenarios, evaluatorNames, totalExamples);
      log.info(`\n${scenarioTable}`);

      // Display summary statistics
      log.info(`\n${chalk.bold.blue('📊 Summary:')}`);
      log.info(`  • Total Scenarios: ${chalk.green(scenarios.length.toString())}`);
      log.info(
        `  • Total Datasets: ${chalk.green(
          scenarios.flatMap((scenario) => scenario.datasets).length.toString()
        )}`
      );
      log.info(`  • Total Examples: ${chalk.green(totalExamples.toString())}`);

      log.info(
        chalk.green(`\n✅ Scenario summary report generated successfully for run ID: ${runId}`)
      );
    } catch (error: any) {
      log.error(`❌ Failed to generate scenario summary report: ${error.message}`);
      throw error;
    }
  };
}
