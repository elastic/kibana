/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionRenderError } from '@kbn/expressions-plugin/public';
import { renderSearchError } from '@kbn/search-errors';
import React from 'react';
import { RemovableUserMessage } from '../types';

export function getOriginalRequestErrorMessages(
  error: ExpressionRenderError | null
): RemovableUserMessage[] {
  const errorMessages: Array<string | { short: string; long: React.ReactNode }> = [];
  if (error && 'original' in error && error.original) {
    const searchErrorDisplay = renderSearchError(error.original);
    if (searchErrorDisplay) {
      errorMessages.push({
        short: error.original.message,
        long: searchErrorDisplay.actions ? (
          <>
            {searchErrorDisplay.body}
            {searchErrorDisplay.actions}
          </>
        ) : (
          searchErrorDisplay.body
        ),
      });
    } else {
      errorMessages.push(error.original.message);
    }
  } else if (error?.message) {
    errorMessages.push(error.message);
  }
  return errorMessages.map((message) => ({
    uniqueId: typeof message === 'string' ? message : message.short,
    severity: 'error',
    displayLocations: [{ id: 'visualizationOnEmbeddable' }],
    longMessage: typeof message === 'string' ? '' : message.long,
    shortMessage: typeof message === 'string' ? message : message.short,
    fixableInEditor: false,
  }));
}

// NOTE - if you are adding a new error message, add it as a UserMessage in get_application_error_messages
// or the getUserMessages method of a particular datasource or visualization class! Alternatively, use the
// addUserMessage function passed down by the application component.
