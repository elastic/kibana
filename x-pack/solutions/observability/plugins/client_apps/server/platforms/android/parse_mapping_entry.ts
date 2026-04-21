/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MappingEntry {
  obfStart: number;
  obfEnd: number;
  origStart: number;
  origEnd: number;
  originalCall: string;
}

/**
 * Parses a pipe-delimited mapping entry string.
 * Format: "obfStart|obfEnd|origStart|origEnd|originalCall|r8Extras"
 */
export function parseMappingEntry(raw: string): MappingEntry {
  const parts = raw.split('|');
  return {
    obfStart: parseInt(parts[0], 10),
    obfEnd: parseInt(parts[1], 10),
    origStart: parseInt(parts[2], 10),
    origEnd: parseInt(parts[3], 10),
    originalCall: parts[4],
  };
}
