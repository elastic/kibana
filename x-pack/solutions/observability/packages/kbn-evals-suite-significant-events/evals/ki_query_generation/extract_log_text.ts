/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const extractLogTextFromSourceDoc = (
  sourceDoc: Record<string, unknown> | undefined
): string => {
  if (!sourceDoc) {
    return '';
  }

  const message = sourceDoc.message;
  if (typeof message === 'string') {
    return message;
  }

  const body = sourceDoc.body;
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object') {
    const bodyText = (body as Record<string, unknown>).text;
    if (typeof bodyText === 'string') {
      return bodyText;
    }
  }

  const attributes = sourceDoc.attributes;
  if (attributes && typeof attributes === 'object') {
    const msg = (attributes as Record<string, unknown>).msg;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  return '';
};
