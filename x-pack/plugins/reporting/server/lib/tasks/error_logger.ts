/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'kibana/server';

const MAX_PARTIAL_ERROR_LENGTH = 1000; // 1000 of beginning, 1000 of end
const ERROR_PARTIAL_SEPARATOR = '...';
const MAX_ERROR_LENGTH = MAX_PARTIAL_ERROR_LENGTH * 2 + ERROR_PARTIAL_SEPARATOR.length;

/*
 * An error message string could be very long, as it sometimes includes huge
 * amount of base64
 */
export const errorLogger = (logger: Logger, message: string, err?: Error) => {
  if (err) {
    const errString = `${message}: ${err}`;
    const errLength = errString.length;
    if (errLength > MAX_ERROR_LENGTH) {
      const subStr = String.prototype.substring.bind(errString);
      const partialErrString =
        subStr(0, MAX_PARTIAL_ERROR_LENGTH) +
        ERROR_PARTIAL_SEPARATOR +
        subStr(errLength - MAX_PARTIAL_ERROR_LENGTH);

      const partialError = new Error(partialErrString);
      partialError.stack = err.stack;
      logger.error(partialError);
      logger.error(
        `A partial version of the entire error message was logged. The entire error message length is: ${errLength} characters.`
      );
    } else {
      const combinedError = new Error(errString);
      combinedError.stack = err.stack;
      logger.error(combinedError);
    }
    return;
  }

  logger.error(message);
};
