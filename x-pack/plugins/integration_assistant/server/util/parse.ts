/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogFormat } from '../../common';

export function decodeRawSamples(encodedContent: string): string {
  const base64encodedContent = encodedContent.split('base64,')[1];
  const logsSampleParsed = Buffer.from(base64encodedContent, 'base64').toString();

  return logsSampleParsed;
}

export function parseSamples(fileContent: string): {
  logFormat: LogFormat;
  parsedSamples: string[];
} {
  let parsedContent;
  let logFormat: LogFormat = 'unsupported';

  try {
    // NDJSON
    parsedContent = fileContent
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));

    // Special case for files that can be parsed as both JSON and NDJSON:
    //   for a one-line array [] -> extract its contents
    //   for a one-line object {} -> do nothing
    if (
      Array.isArray(parsedContent) &&
      parsedContent.length === 1 &&
      Array.isArray(parsedContent[0])
    ) {
      parsedContent = parsedContent[0];
    }
    logFormat = 'ndjson';
  } catch (parseNDJSONError) {
    try {
      // JSON
      parsedContent = JSON.parse(fileContent);
      logFormat = 'json';
    } catch (parseJSONError) {
      // Multi Line JSON
      parsedContent = fileContent
        .split(/\n(?=\{)/) // Split at newline followed by '{'
        .map((entry) => entry.trim()) // Remove leading/trailing whitespace
        .filter((entry) => entry) // Remove empty entries
        .map((entry) => {
          try {
            return JSON.parse(entry);
          } catch (parseError) {
            // All other log types
            parsedContent = fileContent.split('\n').filter((line) => line.trim() !== '');
            return { logFormat, parsedSamples: parsedContent };
          }
        })
        .filter((entry) => entry !== null); // Remove null entries due to parse errors
      logFormat = 'multiline_json';
      return { logFormat, parsedSamples: parsedContent };
    }
  }
  const jsonSamples = parsedContent.map((log: string) => JSON.stringify(log));
  return { logFormat, parsedSamples: jsonSamples };
}
