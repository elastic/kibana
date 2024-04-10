/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isolateErrorString = (msg: string) => {
  return msg.replaceAll(
    /The query has syntax errors: ```\n(.*?)\n```/gms,
    (_, errorString: string) => {
      return errorString;
    }
  );
};

export const getErrorMessagesFromLLMMessage = (msg: string) => {
  const hasErrors = msg.includes('The query has syntax errors');
  if (hasErrors) {
    const errorString = isolateErrorString(msg);
    return errorString.split(',');
  }

  return [];
};
