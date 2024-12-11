/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';

/**
 * Helper function that reverses the history array,
 * removes duplicates and the most recent item
 * @returns a history array of maxCount length
 */
export const getProcessedHistory = ({
  history,
  maxCount,
}: {
  history: FlyoutPanelProps[];
  maxCount: number;
}): FlyoutPanelProps[] => {
  // Step 1: reverse history so the most recent is first
  const reversedHistory = history.slice().reverse();

  // Step 2: remove duplicates
  const historyArray = Array.from(new Set(reversedHistory.map((i) => JSON.stringify(i)))).map((i) =>
    JSON.parse(i)
  );

  // Omit the first (current) entry and return array of maxCount length
  return historyArray.slice(1, maxCount + 1);
};
