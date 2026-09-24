/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { isImproved } from '@kbn/evals-common';

/** Where the evals framework ingests scores. A data stream, so it is hidden from `_cat/indices`. */
const SCORES_INDEX = '.evaluation-scores';

/** One evaluator's mean per arm, plus the polarity needed to say which arm won. */
export interface ArmComparisonRow {
  evaluator: string;
  direction: 'maximize' | 'minimize' | 'neutral';
  meanByArm: Record<string, number>;
}

interface ScoreAggregations {
  latest_execution: {
    buckets: Array<{
      key: string;
      by_evaluator: {
        buckets: Array<{
          key: string;
          direction: { buckets: Array<{ key: string }> };
          by_arm: { buckets: Array<{ key: string; mean: { value: number | null } }> };
        }>;
      };
    }>;
  };
}

const DIRECTIONS = new Set(['maximize', 'minimize', 'neutral']);

const toDirection = (value: string | undefined): ArmComparisonRow['direction'] =>
  value !== undefined && DIRECTIONS.has(value)
    ? (value as ArmComparisonRow['direction'])
    : 'neutral';

/**
 * Reads the arm means for the most recent run against one dataset.
 *
 * Scoped to the newest `metadata.execution_id` rather than to a time range: arms are only
 * comparable within a run, since the corpus window moves between runs and the reranker's state
 * moves with it.
 */
export const fetchArmComparison = async ({
  esClient,
  datasetName,
}: {
  esClient: Client;
  datasetName: string;
}): Promise<ArmComparisonRow[]> => {
  const response = await esClient.search<unknown, ScoreAggregations>({
    index: SCORES_INDEX,
    size: 0,
    query: { bool: { filter: [{ term: { 'example.dataset.name': datasetName } }] } },
    aggs: {
      latest_execution: {
        terms: {
          field: 'metadata.execution_id',
          size: 1,
          order: { newest: 'desc' },
        },
        aggs: {
          newest: { max: { field: '@timestamp' } },
          by_evaluator: {
            terms: { field: 'evaluator.name', size: 50 },
            aggs: {
              direction: { terms: { field: 'evaluator.direction', size: 1 } },
              by_arm: {
                terms: { field: 'experiment_name', size: 20 },
                aggs: { mean: { avg: { field: 'evaluator.score' } } },
              },
            },
          },
        },
      },
    },
  });

  const execution = response.aggregations?.latest_execution.buckets[0];
  if (!execution) return [];

  return execution.by_evaluator.buckets
    .map((evaluator) => ({
      evaluator: evaluator.key,
      direction: toDirection(evaluator.direction.buckets[0]?.key),
      meanByArm: Object.fromEntries(
        evaluator.by_arm.buckets
          .filter((arm) => arm.mean.value !== null)
          .map((arm) => [arm.key, arm.mean.value as number])
      ),
    }))
    .filter((row) => Object.keys(row.meanByArm).length > 0)
    .sort((a, b) => a.evaluator.localeCompare(b.evaluator));
};

/** Arm names in the order they should appear, which is the order they were run. */
const armsOf = (rows: ArmComparisonRow[]): string[] => [
  ...new Set(rows.flatMap((row) => Object.keys(row.meanByArm))),
];

const format = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

/**
 * The single arm that beat the others on an evaluator, or undefined when there is no such arm.
 *
 * A tie has no winner: with every arm scoring the same, marking one is arbitrary and reads as a
 * real difference. `Count Sanity` ties at 0 on a healthy run, which is exactly when a spurious mark
 * is most misleading.
 */
const winnerOf = (row: ArmComparisonRow, arms: string[]): string | undefined => {
  if (row.direction === 'neutral') return undefined;

  const scored = arms.filter((arm) => row.meanByArm[arm] !== undefined);
  if (scored.length < 2) return undefined;

  const best = scored.reduce((winner, arm) =>
    isImproved(row.meanByArm[arm] - row.meanByArm[winner], row.direction) ? arm : winner
  );

  const tied = scored.some((arm) => arm !== best && row.meanByArm[arm] === row.meanByArm[best]);
  return tied ? undefined : best;
};

/**
 * Renders the arm-by-evaluator table, marking the winning arm per evaluator with `*`.
 *
 * This is the comparison the framework's own report cannot show: its table is execution-scoped and
 * grouped by dataset, and arms now share a dataset, so its row is an average across arms.
 */
export const formatArmComparison = (rows: ArmComparisonRow[]): string => {
  if (rows.length === 0) return 'No scores found for this dataset.';

  const arms = armsOf(rows);
  const header = ['Evaluator', ...arms];
  const body = rows.map((row) => {
    const best = winnerOf(row, arms);

    return [
      row.evaluator,
      ...arms.map((arm) => {
        const value = row.meanByArm[arm];
        if (value === undefined) return '-';
        return arm === best ? `${format(value)} *` : format(value);
      }),
    ];
  });

  const widths = header.map((_unused, column) =>
    Math.max(header[column].length, ...body.map((cells) => cells[column].length))
  );
  const line = (cells: string[]) =>
    cells
      .map((cell, column) => cell.padEnd(widths[column]))
      .join('  ')
      .trimEnd();

  return [line(header), line(widths.map((width) => '-'.repeat(width))), ...body.map(line)].join(
    '\n'
  );
};

/** The same table as GitHub-flavoured markdown, for pasting into an issue. */
export const toMarkdownArmComparison = (rows: ArmComparisonRow[]): string => {
  if (rows.length === 0) return '';

  const arms = armsOf(rows);
  const lines = [
    `| Evaluator | ${arms.join(' | ')} |`,
    `|---|${arms.map(() => '---').join('|')}|`,
    ...rows.map(
      (row) =>
        `| ${row.evaluator} | ${arms
          .map((arm) => (row.meanByArm[arm] === undefined ? '-' : format(row.meanByArm[arm])))
          .join(' | ')} |`
    ),
  ];
  return lines.join('\n');
};

/**
 * Logs the arm comparison for the run that just finished.
 *
 * Never throws: this is reporting, and a run that produced real scores must not be failed by a
 * problem rendering them.
 */
export const logArmComparison = async ({
  esClient,
  datasetName,
  log,
}: {
  esClient: Client;
  datasetName: string;
  log: ToolingLog;
}): Promise<void> => {
  try {
    // Scores are ingested per example as the run proceeds; refresh so the last ones are visible.
    await esClient.indices.refresh({ index: SCORES_INDEX });
    const rows = await fetchArmComparison({ esClient, datasetName });

    log.info(`\nArm comparison (${datasetName}), * marks the better arm per evaluator:\n`);
    log.info(formatArmComparison(rows));
    log.debug(`\nMarkdown:\n\n${toMarkdownArmComparison(rows)}`);
  } catch (error) {
    log.warning(`Could not render the arm comparison: ${error}`);
  }
};
