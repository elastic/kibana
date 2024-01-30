/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogDocument, StackTraceFields } from '../../common/document';
import * as constants from '../../common/constants';
import { getFieldFromDoc } from './get_field_from_flattened_doc';

export const getStacktraceFields = (doc: LogDocument): StackTraceFields => {
  const errorStackTrace = getFieldFromDoc(doc, constants.ERROR_STACK_TRACE);
  const errorExceptionStackTrace = getFieldFromDoc(doc, constants.ERROR_EXCEPTION_STACKTRACE);
  const errorLogStackTrace = getFieldFromDoc(doc, constants.ERROR_LOG_STACKTRACE);

  return {
    [constants.ERROR_STACK_TRACE]: errorStackTrace,
    [constants.ERROR_EXCEPTION_STACKTRACE]: errorExceptionStackTrace,
    [constants.ERROR_LOG_STACKTRACE]: errorLogStackTrace,
  };
};
