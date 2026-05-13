/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import type { SomeDevLog } from '@kbn/some-dev-log';

// Bar segment widths (chars inside ▕ … ▏)
const BAR_PROJECT_W = 2; // ██ — fixed, always represents the changed project
const BAR_DEP_W = 14; // ░…  — proportional to dep count
const BAR_DOWN_W = 14; // █…  — proportional to downstream count (yellow/red); spaces when 0

// Total bar width including the ▕▏ edges
const BAR_TOTAL_W = 1 + BAR_PROJECT_W + BAR_DEP_W + BAR_DOWN_W + 1; // 32

// Minimum spaces between display columns
const COL_GAP = 3;

export interface ScopeSummaryRow {
  name: string;
  depCount: number;
  dependentCount: number;
}

/**
 * Prints a visual scope summary after the changed-projects table:
 *
 *   ● light  17 projects to check
 *                                 deps    downstream
 *     ▕██░░░░░░░░░░░░░░          ▏  kbn-ts-type-check-oblt-cli   ×16     —
 *
 * One bar per changed project, sorted by downstream count descending.
 * Heaviness is determined by the total number of projects tsc will process.
 */
export function printScopeSummary(
  rows: ScopeSummaryRow[],
  totalProjectCount: number,
  log: SomeDevLog
): void {
  if (rows.length === 0) return;

  // ── Heaviness header ──────────────────────────────────────────────────────
  const { label, bullet } =
    totalProjectCount < 50
      ? { label: 'light', bullet: chalk.green('●') }
      : totalProjectCount < 200
      ? { label: 'medium', bullet: chalk.yellow('●') }
      : { label: 'heavy', bullet: chalk.red('●') };

  log.info(
    `${bullet} ${label}  ${totalProjectCount} project${totalProjectCount === 1 ? '' : 's'} to check`
  );

  // ── Bars ──────────────────────────────────────────────────────────────────
  const sorted = [...rows].sort((a, b) => b.dependentCount - a.dependentCount);

  const maxDeps = Math.max(...sorted.map((r) => r.depCount), 0);
  const maxDown = Math.max(...sorted.map((r) => r.dependentCount), 0);

  const fmt = (n: number) => (n === 0 ? '—' : `×${n}`);

  const nameColW = Math.max(...sorted.map((r) => r.name.length));
  const depsColW = Math.max(...sorted.map((r) => fmt(r.depCount).length), 'deps'.length);
  const downColW = Math.max(
    ...sorted.map((r) => fmt(r.dependentCount).length),
    'downstream'.length
  );

  // Column header line — aligned with the data rows
  // Prefix: 2 (indent) + BAR_TOTAL_W (32) + 2 (gap after bar) = 36 chars before name
  const headerPrefix = ' '.repeat(2 + BAR_TOTAL_W + 2 + nameColW);
  log.info(
    headerPrefix + 'deps'.padStart(depsColW + COL_GAP) + 'downstream'.padStart(downColW + COL_GAP)
  );

  // Data rows
  for (const { name, depCount, dependentCount } of sorted) {
    const bar = renderBar(depCount, dependentCount, maxDeps, maxDown);
    const nameStr = name.padEnd(nameColW);
    const depsStr = fmt(depCount).padStart(depsColW + COL_GAP);
    const downStr = fmt(dependentCount).padStart(downColW + COL_GAP);
    log.info(`  ${bar}  ${nameStr}${depsStr}${downStr}`);
  }
}

function scaleToWidth(value: number, max: number, width: number): number {
  if (max === 0 || value === 0) return 0;
  return Math.max(1, Math.round((value / max) * width));
}

function renderBar(
  depCount: number,
  dependentCount: number,
  maxDeps: number,
  maxDown: number
): string {
  const depFill = scaleToWidth(depCount, maxDeps, BAR_DEP_W);
  const downFill = scaleToWidth(dependentCount, maxDown, BAR_DOWN_W);

  const project = '██';
  const deps = '░'.repeat(depFill) + ' '.repeat(BAR_DEP_W - depFill);

  const downRaw = '█'.repeat(downFill) + ' '.repeat(BAR_DOWN_W - downFill);
  const downstream =
    dependentCount === 0
      ? ' '.repeat(BAR_DOWN_W)
      : dependentCount <= 50
      ? chalk.yellow(downRaw)
      : chalk.red(downRaw);

  return `▕${project}${deps}${downstream}▏`;
}
