/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const doesUrlMatchWithPattern = (url: string, pattern: string) => {
  const parts = pattern.split('*');
  for (const part of parts) {
    const index = url.indexOf(part);
    if (index === -1) {
      return false;
    }
    url = url.slice(index + part.length);
  }
  return true;
};

export const shouldTraceUrl = (url: string, patterns: string[]) => {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => doesUrlMatchWithPattern(url, pattern));
};
