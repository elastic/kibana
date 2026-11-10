/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { harnessPaths } from './paths';

export interface ModelPrice {
  /** USD per million uncached input tokens. */
  input: number;
  /** USD per million cached input tokens. */
  cachedInput: number;
  /** USD per million output tokens. */
  output: number;
}

/**
 * List prices, matched by substring against the connector id. Override or extend in
 * `~/.nightshift-harness/prices.json`.
 */
export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'claude-5.5-haiku': { input: 0.1, cachedInput: 0.01, output: 0.5 },
  'claude-5.5-sonnet': { input: 2.0, cachedInput: 0.2, output: 10.0 },
  'claude-5.5-opus': { input: 10.0, cachedInput: 1.0, output: 50.0 },
  'claude-4.6-sonnet': { input: 3.0, cachedInput: 0.3, output: 15.0 },
  'gpt-5.4-mini': { input: 0.75, cachedInput: 0.075, output: 4.5 },
  'gpt-5.4': { input: 2.5, cachedInput: 0.25, output: 15.0 },
  'gpt-5.6-sol': { input: 2.5, cachedInput: 0.25, output: 15.0 },
  'gemini-3.8-flash': { input: 0.825, cachedInput: 0.0825, output: 4.125 },
};

export const FALLBACK_PRICE: ModelPrice = { input: 2.0, cachedInput: 0.2, output: 10.0 };

let cached: Record<string, ModelPrice> | undefined;

const loadPrices = (): Record<string, ModelPrice> => {
  if (cached) return cached;
  const path = Path.join(harnessPaths().root, 'prices.json');
  cached = Fs.existsSync(path)
    ? { ...DEFAULT_PRICES, ...(JSON.parse(Fs.readFileSync(path, 'utf8')) as typeof DEFAULT_PRICES) }
    : DEFAULT_PRICES;
  return cached;
};

export const priceFor = (connectorId: string | undefined): ModelPrice => {
  if (!connectorId) return FALLBACK_PRICE;
  const prices = loadPrices();
  const match = Object.keys(prices)
    .filter((key) => connectorId.includes(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? prices[match] : FALLBACK_PRICE;
};

/** `inputTokens` includes the cached ones, as the investigation usage records it. */
export const costUsd = ({
  connectorId,
  inputTokens = 0,
  cachedInputTokens = 0,
  outputTokens = 0,
}: {
  connectorId?: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
}): number => {
  const price = priceFor(connectorId);
  const uncached = Math.max(0, inputTokens - cachedInputTokens);
  return (
    (uncached * price.input + cachedInputTokens * price.cachedInput + outputTokens * price.output) /
    1_000_000
  );
};
