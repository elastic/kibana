/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PageErrorNotExist } from './page_error_not_exist';
import { PageErrorForbidden } from './page_error_forbidden';

export function getPageErrorCode(errorOrErrors: any) {
  const errors = Array.isArray(errorOrErrors) ? errorOrErrors : [errorOrErrors];
  const firstError = errors.find((error: any) => {
    if (error) {
      return [403, 404].includes(error.statusCode);
    }

    return false;
  });

  if (firstError) {
    return firstError.statusCode;
  }
}

export function PageError({ errorCode, id }: { errorCode?: any; id?: any }) {
  switch (errorCode) {
    case 404:
      return <PageErrorNotExist id={id} />;

    case 403:
    default:
      return <PageErrorForbidden />;
  }
}
