/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MessageBody {
  error?: string;
  message?: string;
  statusCode?: number;
  status_code?: number;
}

export const parseJsonFromBody = async (response: Response): Promise<MessageBody | null> => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};
