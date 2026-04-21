/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDocument } from './fetch_mappings';
import type { MappingEntry } from './parse_mapping_entry';

const AT_FRAME_REGEX = /^at\s+(\S+)\.(\S+)\(([^)]*)\)$/;
const LINE_NUMBER_REGEX = /:(\d+)$/;

/**
 * Extracts unique obfuscated method keys ("className.methodName") from a stacktrace.
 */
export function extractMethodKeys(stacktrace: string): string[] {
  const keys = new Set<string>();
  for (const line of stacktrace.split('\n')) {
    const match = line.trim().match(AT_FRAME_REGEX);
    if (match) {
      keys.add(`${match[1]}.${match[2]}`);
    }
  }
  return [...keys];
}

/**
 * Deobfuscates a full stacktrace using R8 mapping data from Elasticsearch.
 *
 * Processes each line independently:
 * - "at" frames are looked up in the mappings, range-matched, and deobfuscated
 * - Non-"at" lines (exception headers, "Caused by:", "... N more") pass through as-is
 */
export function retrace(stacktraceText: string, mappings: Map<string, MappingDocument>): string {
  const lines = stacktraceText.split('\n');
  const output: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      output.push('');
      continue;
    }

    const frameMatch = trimmed.match(AT_FRAME_REGEX);
    if (!frameMatch) {
      output.push(trimmed);
      continue;
    }

    const className = frameMatch[1];
    const methodName = frameMatch[2];
    const sourceInfo = frameMatch[3];

    let lineNumber: number | null = null;
    const lineMatch = sourceInfo.match(LINE_NUMBER_REGEX);
    if (lineMatch) {
      lineNumber = parseInt(lineMatch[1], 10);
    }

    const methodKey = `${className}.${methodName}`;
    const doc = mappings.get(methodKey);

    if (!doc) {
      output.push(`\tat ${className}.${methodName}(${sourceInfo})`);
      continue;
    }

    let matched: MappingEntry[] = [];
    if (lineNumber !== null) {
      matched = doc.entries.filter((e) => lineNumber! >= e.obfStart && lineNumber! <= e.obfEnd);
    }

    if (matched.length === 0 && doc.defaultMapping) {
      for (const dm of doc.defaultMapping.split('\n')) {
        output.push(`\tat ${dm}`);
      }
      continue;
    }

    if (matched.length === 0) {
      output.push(`\tat ${className}.${methodName}(${sourceInfo})`);
      continue;
    }

    for (const entry of matched) {
      const origLine = interpolateLine(entry, lineNumber!);
      const call = entry.originalCall;
      const deobfuscated = call.endsWith(')')
        ? `${call.slice(0, -1)}:${origLine})`
        : `${call}:${origLine}`;
      output.push(`\tat ${deobfuscated}`);
    }
  }

  return output.join('\n');
}

function interpolateLine(entry: MappingEntry, obfLine: number): number {
  if (entry.origStart === entry.origEnd) {
    return entry.origStart;
  }
  return entry.origStart + (obfLine - entry.obfStart);
}
