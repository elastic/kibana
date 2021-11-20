/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { MAPPING_ERROR_ROUTE } from '../../common/constants';

interface EsBadRequestError {
  body?: {
    error?: string;
    message?: string;
  };
}

function contains(message: string, phrase: string) {
  return message.indexOf(phrase) !== -1;
}

export function shouldRedirect(error?: EsBadRequestError) {
  if (!error || !error.body || error.body.error !== 'Bad Request' || !error.body.message) {
    return false;
  }
  const { message } = error.body;
  return (
    contains(message, 'search_phase_execution_exception') ||
    contains(message, 'Please use a keyword field instead.') ||
    contains(message, 'set fielddata=true')
  );
}

export function useMappingCheck(error?: EsBadRequestError) {
  const history = useHistory();

  useEffect(() => {
    if (shouldRedirect(error)) {
      history.push(MAPPING_ERROR_ROUTE);
    }
  }, [error, history]);
}
