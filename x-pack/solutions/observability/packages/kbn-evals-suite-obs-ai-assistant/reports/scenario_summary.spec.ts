/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { table } from 'table';
import chalk from 'chalk';
import { sumBy } from 'lodash';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { EvaluationScoreRepository } from '@kbn/evals/src/utils/score_repository';
import { evaluate } from '../src/evaluate';

interface EvaluatorStats {
  mean: number;
  stdDev: number;
  count: number;
  percentage: number;
}

interface DatasetInfo {
  name: string;
  evaluatorStats: Map<string, EvaluatorStats>;
  examplesCount: number;
}

interface ScenarioInfo {
  name: string;
  datasets: DatasetInfo[];
  overallStats: Map<string, EvaluatorStats>;
}

interface ScoresByScenarioResult {
  scenarios: ScenarioInfo[];
  evaluatorNames: string[];
  metadata: {
    runId: string;
    timestamp?: string;
    model?: string;
  };
}

/**
 * Formats statistics into a multi-line cell content with percentage, mean, and standard deviation.
 */
function formatStatisticsCell(
  percentage: number,
  mean: number,
  stdDev: number,
  isOverall: boolean = false
): string {
  const percentageStr = `${percentage.toFixed(1)}%`;
  const meanStr = `mean: ${mean.toFixed(3)}`;
  const stdDevStr = `std: ${stdDev.toFixed(3)}`;

  if (isOverall) {
    return [
      chalk.bold.yellow(percentageStr),
      chalk.bold.green(meanStr),
      chalk.bold.green(stdDevStr),
    ].join('\n');
  }

  return [chalk.bold.yellow(percentageStr), chalk.cyan(meanStr), chalk.cyan(stdDevStr)].join('\n');
}

/**
 * Calculates overall statistics across all scenarios for each evaluator.
 */
function calculateOverallStats(
  scenarios: ScenarioInfo[],
  evaluatorNames: string[]
): Map<string, { mean: number; stdDev: number; percentage: number }> {
  const overallStats = new Map<string, { mean: number; stdDev: number; percentage: number }>();

  evaluatorNames.forEach((evaluatorName) => {
    const allScores: number[] = [];

    scenarios.forEach((scenario) => {
      scenario.datasets.forEach((dataset) => {
        const stats = dataset.evaluatorStats.get(evaluatorName);
        if (stats) {
          // Note: We're using the stats to reconstruct approximate individual scores
          for (let i = 0; i < stats.count; i++) {
            allScores.push(stats.mean);
          }
        }
      });
    });

    if (allScores.length > 0) {
      const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const variance =
        allScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / allScores.length;
      const stdDev = Math.sqrt(variance);
      const percentage = (allScores.filter((s) => s >= 0.5).length / allScores.length) * 100;

      overallStats.set(evaluatorName, { mean, stdDev, percentage });
    }
  });

  return overallStats;
}

/**
 * Creates a formatted table displaying scenario evaluation statistics.
 * Includes one row per scenario and an overall summary row.
 */
function createScenarioSummaryTable(
  scenarios: ScenarioInfo[],
  evaluatorNames: string[],
  totalExamples: number
): string {
  // Build headers - scenario name, examples count, and evaluator columns
  const headers = ['Scenario', '# Examples', ...evaluatorNames];

  // Build rows - one per scenario with aggregated statistics
  const scenarioRows = scenarios.map((scenario) => {
    const scenarioTotalExamples = sumBy(scenario.datasets, (d) => d.examplesCount);
    const row = [chalk.bold.white(scenario.name), scenarioTotalExamples.toString()];

    evaluatorNames.forEach((evaluatorName) => {
      const stats = scenario.overallStats.get(evaluatorName);
      if (stats && stats.count > 0) {
        const cellContent = formatStatisticsCell(stats.percentage * 100, stats.mean, stats.stdDev);
        row.push(cellContent);
      } else {
        row.push(chalk.gray('-'));
      }
    });

    return row;
  });

  // Calculate and add overall row (aggregated across ALL scenarios)
  const overallStats = calculateOverallStats(scenarios, evaluatorNames);
  const overallRow = [chalk.bold.green('Overall'), chalk.bold.green(totalExamples.toString())];

  evaluatorNames.forEach((evaluatorName) => {
    const stats = overallStats.get(evaluatorName);
    if (stats) {
      const cellContent = formatStatisticsCell(stats.percentage, stats.mean, stats.stdDev, true);
      overallRow.push(cellContent);
    } else {
      overallRow.push(chalk.bold.green('-'));
    }
  });

  // Build column alignment configuration
  const columnConfig: Record<number, { alignment: 'right' | 'left' }> = {
    0: { alignment: 'left' },
  };
  for (let i = 1; i < headers.length; i++) {
    columnConfig[i] = { alignment: 'right' };
  }

  return table([headers, ...scenarioRows, overallRow], {
    columns: columnConfig,
  });
}

/**
 * Displays the complete scenario summary report including metadata, table, and statistics.
 */
function displayScenarioSummaryReport(
  scenarios: ScenarioInfo[],
  evaluatorNames: string[],
  metadata: { runId: string; timestamp?: string; model?: string },
  log: SomeDevLog
): void {
  // Validate input parameters
  if (!scenarios || scenarios.length === 0) {
    log.warning('⚠️ No scenarios found to display');
    return;
  }

  if (!evaluatorNames || evaluatorNames.length === 0) {
    log.warning('⚠️ No evaluators found to display');
    return;
  }

  if (!metadata || !metadata.runId) {
    log.warning('⚠️ Invalid metadata provided');
    return;
  }

  // Display metadata
  log.info(`\n${chalk.bold.blue('📋 Run Metadata:')}`);
  log.info(
    `Run: ${chalk.cyan(metadata.runId)} (${
      metadata.timestamp || 'Unknown time'
    }) - Model: ${chalk.yellow(metadata.model || 'Unknown')}`
  );

  // Calculate total examples across all scenarios
  const totalExamples = sumBy(
    scenarios.flatMap((scenario) => scenario.datasets),
    (dataset) => dataset.examplesCount
  );

  // Create and display scenario summary table
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
}

/**
 * Retrieves evaluation scores for a given run and groups them by scenario.
 * Scenarios are extracted from dataset names using the pattern "scenario: dataset-name".
 * This function is specific to Observability AI Assistant evaluations.
 */
async function getScoresByScenario({
  scoreRepository,
  log,
  runId,
}: {
  scoreRepository: EvaluationScoreRepository;
  log: SomeDevLog;
  runId: string;
}): Promise<ScoresByScenarioResult> {
  // Validate input parameters
  if (!runId || typeof runId !== 'string' || runId.trim().length === 0) {
    throw new Error('Invalid runId: must be a non-empty string');
  }

  if (!scoreRepository) {
    throw new Error('Score repository is required');
  }

  if (!log) {
    throw new Error('Logger is required');
  }

  log.info(`Retrieving scores for run ID: ${runId} and grouping by scenario`);

  let scores;
  try {
    scores = await scoreRepository.getScoresByRunId(runId);
  } catch (error) {
    throw new Error(`Failed to retrieve scores for run ID ${runId}: ${error.message}`);
  }

  if (!scores || scores.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}`);
  }

  // Extract unique evaluator names from all scores
  const uniqueEvaluatorNames = new Set<string>();
  scores.forEach((score: any) => uniqueEvaluatorNames.add(score.evaluator.name));
  const sortedEvaluatorNames = Array.from(uniqueEvaluatorNames).sort();

  // Group datasets by scenario (extracted from dataset name)
  const scenarioToDatasetsMap = new Map<
    string,
    Array<{
      name: string;
      evaluatorStats: Map<string, EvaluatorStats>;
      examplesCount: number;
      scores: any[];
    }>
  >();

  scores.forEach((score: any) => {
    const datasetName = score.dataset.name;
    // Extract scenario name (everything before the first colon)
    const scenarioNameMatch = datasetName.match(/^([^:]+):/);
    const extractedScenarioName = scenarioNameMatch ? scenarioNameMatch[1].trim() : 'Other';

    if (!scenarioToDatasetsMap.has(extractedScenarioName)) {
      scenarioToDatasetsMap.set(extractedScenarioName, []);
    }

    const scenarioDatasets = scenarioToDatasetsMap.get(extractedScenarioName)!;
    let existingDataset = scenarioDatasets.find((dataset) => dataset.name === datasetName);

    if (!existingDataset) {
      existingDataset = {
        name: datasetName,
        evaluatorStats: new Map(),
        examplesCount: score.dataset.examples_count,
        scores: [],
      };
      scenarioDatasets.push(existingDataset);
    }

    existingDataset.evaluatorStats.set(score.evaluator.name, {
      mean: score.evaluator.stats.mean,
      stdDev: score.evaluator.stats.std_dev,
      count: score.evaluator.stats.count,
      percentage: score.evaluator.stats.percentage,
    });

    existingDataset.scores.push(score);
  });

  // Calculate overall stats per scenario
  const processedScenarios = Array.from(scenarioToDatasetsMap.entries())
    .map(([scenarioName, scenarioDatasets]) => {
      // Calculate overall stats for this scenario across all datasets
      const scenarioOverallStats = new Map<string, EvaluatorStats>();

      sortedEvaluatorNames.forEach((evaluatorName) => {
        const allEvaluatorScores: number[] = [];

        scenarioDatasets.forEach((dataset) => {
          const evaluatorStats = dataset.evaluatorStats.get(evaluatorName);
          if (evaluatorStats) {
            // Collect all individual scores for this evaluator across datasets in this scenario
            const datasetEvaluatorScores = dataset.scores
              .filter((score) => score.evaluator.name === evaluatorName)
              .flatMap((score) => score.evaluator.scores || []);
            allEvaluatorScores.push(...datasetEvaluatorScores);
          }
        });

        if (allEvaluatorScores.length > 0) {
          const mean =
            allEvaluatorScores.reduce((sum, score) => sum + score, 0) / allEvaluatorScores.length;
          const variance =
            allEvaluatorScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
            allEvaluatorScores.length;
          const stdDev = Math.sqrt(variance);
          const count = allEvaluatorScores.length;
          const percentage = allEvaluatorScores.filter((score) => score >= 0.5).length / count;

          scenarioOverallStats.set(evaluatorName, {
            mean,
            stdDev,
            count,
            percentage,
          });
        }
      });

      return {
        name: scenarioName,
        datasets: scenarioDatasets.map((dataset) => ({
          name: dataset.name,
          evaluatorStats: dataset.evaluatorStats,
          examplesCount: dataset.examplesCount,
        })),
        overallStats: scenarioOverallStats,
      };
    })
    .sort((scenarioA, scenarioB) => scenarioA.name.localeCompare(scenarioB.name));

  return {
    scenarios: processedScenarios,
    evaluatorNames: sortedEvaluatorNames,
    metadata: {
      runId,
      timestamp: scores[0]?.['@timestamp'],
      model: scores[0]?.model.id,
    },
  };
}

evaluate.describe('Observability AI Assistant Scenario Summary Report', { tag: '@svlOblt' }, () => {
  evaluate('Scenario-Grouped Evaluation Results', async ({ esClient, log }) => {
    const runId = process.env.EVALUATION_RUN_ID;

    if (!runId) {
      log.warning('⚠️ Skipping scenario summary: EVALUATION_RUN_ID environment variable not set');
      log.info('To use this report, set:');
      log.info('  - EVALUATION_RUN_ID: ID of the evaluation run to report on');
      return;
    }

    log.info(chalk.bold.blue('🔍 === SCENARIO SUMMARY REPORT ==='));
    log.info(`Run ID: ${chalk.cyan(runId)}`);

    try {
      const { scenarios, evaluatorNames, metadata } = await getScoresByScenario({
        scoreRepository: new EvaluationScoreRepository(esClient, log),
        log,
        runId,
      });

      // Display the complete scenario summary report
      displayScenarioSummaryReport(scenarios, evaluatorNames, metadata, log);

      log.info(
        chalk.green(`\n✅ Scenario summary report generated successfully for run ID: ${runId}`)
      );
    } catch (error) {
      log.error(`❌ Failed to generate scenario summary report: ${error.message}`);
      throw error;
    }
  });
});
