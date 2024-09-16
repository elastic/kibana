/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function convertTimestamp(timestamp?: string | number | null): string | number | null {
  if (timestamp) {
    if (typeof timestamp === 'string') {
      const trimmedTimestamp = timestamp.trim();
      if (trimmedTimestamp.length > 0) {
        const parsedTimestamp = parseInt(trimmedTimestamp, 10);

        if (!isNaN(parsedTimestamp) && JSON.stringify(parsedTimestamp) === trimmedTimestamp) {
          return parsedTimestamp; // return converted epoch
        }
        return trimmedTimestamp; // return string
      }
    }
    if (typeof timestamp === 'number') {
      return timestamp; // return epoch
    }
  }
  return null;
}
