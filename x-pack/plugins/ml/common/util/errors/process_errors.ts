/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ErrorType,
  MLErrorObject,
  isBoomError,
  isErrorString,
  isErrorMessage,
  isEsErrorBody,
  isMLResponseError,
} from './types';

export const extractErrorProperties = (error: ErrorType): MLErrorObject => {
  // extract properties of the error object from within the response error
  // coming from Kibana, Elasticsearch, and our own ML messages

  // some responses contain raw es errors as part of a bulk response
  // e.g. if some jobs fail the action in a bulk request
  if (isEsErrorBody(error)) {
    return {
      message: error.error.reason,
      statusCode: error.status,
      fullError: error,
    };
  }

  if (isErrorString(error)) {
    return {
      message: error,
    };
  }

  if (isBoomError(error)) {
    return {
      message: error.output.payload.message,
      statusCode: error.output.payload.statusCode,
    };
  }

  if (error?.body === undefined && !error?.message) {
    return {
      message: '',
    };
  }

  if (typeof error.body === 'string') {
    return {
      message: error.body,
    };
  }

  if (isMLResponseError(error)) {
    if (
      typeof error.body.attributes === 'object' &&
      typeof error.body.attributes.body?.error?.reason === 'string'
    ) {
      return {
        message: error.body.attributes.body.error.reason,
        statusCode: error.body.statusCode,
        fullError: error.body.attributes.body,
      };
    } else {
      return {
        message: error.body.message,
        statusCode: error.body.statusCode,
      };
    }
  }

  if (isErrorMessage(error)) {
    return {
      message: error.message,
    };
  }

  // If all else fail return an empty message instead of JSON.stringify
  return {
    message: '',
  };
};

export const extractErrorMessage = (error: ErrorType): string => {
  // extract only the error message within the response error coming from Kibana, Elasticsearch, and our own ML messages
  const errorObj = extractErrorProperties(error);
  return errorObj.message;
};
