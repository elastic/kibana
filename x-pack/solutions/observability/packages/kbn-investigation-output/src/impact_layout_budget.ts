/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationImpact } from '@kbn/significant-events-schema';

/** Rough height the impact block may take before the rest is tucked behind "Show more". */
export const IMPACT_HEIGHT_BUDGET_PX = 500;

/**
 * Napkin estimates for a ~350px wide flyout column. They only need to be good enough to stop the
 * impact block from putting too much on screen at once, not to match the rendered layout.
 */
const TEXT_CHARS_PER_LINE = 45;
const TEXT_LINE_HEIGHT_PX = 20;
/** Chart title, plot, and legend row. */
const CHART_HEIGHT_PX = 260;
/** One collapsed entity row in the entity list. */
const ENTITY_ROW_HEIGHT_PX = 40;
/** Space between two parts of the impact block. */
const PART_GAP_PX = 8;

/** Estimated rendered height of a text block: its line count at a fixed line length. */
export const estimateTextHeight = (text: string): number =>
  Math.ceil(text.trim().length / TEXT_CHARS_PER_LINE) * TEXT_LINE_HEIGHT_PX;

export interface VisibleImpactParts {
  showEvidenceChart: boolean;
  showEvidenceDescription: boolean;
  visibleEntityCount: number;
  /** Whether anything was left out, so a "Show more" control is needed. */
  isTruncated: boolean;
}

/**
 * Decides how much of the impact block to show up front. Parts are taken in render order — the
 * summary, the evidence chart, the evidence description, then the entity rows — until the next
 * part would exceed the budget; everything from there on is hidden. The summary is always shown.
 */
export const getVisibleImpactParts = (
  { summary, evidence, entities = [] }: InvestigationImpact,
  budget: number = IMPACT_HEIGHT_BUDGET_PX
): VisibleImpactParts => {
  const summaryText = summary?.trim() ?? '';
  let used = summaryText ? estimateTextHeight(summaryText) : 0;
  let isFull = false;

  const fits = (height: number): boolean => {
    if (isFull) {
      return false;
    }
    const next = used + (used > 0 ? PART_GAP_PX : 0) + height;
    if (next > budget) {
      isFull = true;
      return false;
    }
    used = next;
    return true;
  };

  const hasChart = Boolean(evidence?.chart);
  const hasDescription = Boolean(evidence?.description.trim());
  const showEvidenceChart = hasChart && fits(CHART_HEIGHT_PX);
  const showEvidenceDescription =
    hasDescription && fits(estimateTextHeight(evidence?.description ?? ''));

  let visibleEntityCount = 0;
  while (visibleEntityCount < entities.length && fits(ENTITY_ROW_HEIGHT_PX)) {
    visibleEntityCount++;
  }

  return {
    showEvidenceChart,
    showEvidenceDescription,
    visibleEntityCount,
    isTruncated:
      showEvidenceChart !== hasChart ||
      showEvidenceDescription !== hasDescription ||
      visibleEntityCount < entities.length,
  };
};
