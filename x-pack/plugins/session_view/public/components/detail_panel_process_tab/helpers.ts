/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Serialize an array of executable tuples to a copyable text.
 *
 * @param  {String[][]} executable
 * @return {String} serialized string with data of each executable
 */
export const getProcessExecutableCopyText = (executable: string[][]) => {
  try {
    return executable
      .map((execTuple) => {
        const [execCommand, eventAction] = execTuple;
        if (!execCommand || !eventAction || execTuple.length !== 2) {
          throw new Error();
        }
        return `${execCommand} ${eventAction}`;
      })
      .join(', ');
  } catch (_) {
    return '';
  }
};
