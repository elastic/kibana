/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut } from '@elastic/eui';

import { DocumentCreationLogic } from '..';
import { DOCUMENT_CREATION_ERRORS, DOCUMENT_CREATION_WARNINGS } from '../constants';

export const Errors: React.FC = () => {
  const { errors, warnings } = useValues(DocumentCreationLogic);

  return (
    <>
      {errors.length > 0 && (
        <EuiCallOut color="danger" iconType="alert" title={DOCUMENT_CREATION_ERRORS.TITLE}>
          {errors.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </EuiCallOut>
      )}
      {warnings.length > 0 && (
        <EuiCallOut color="warning" iconType="alert" title={DOCUMENT_CREATION_WARNINGS.TITLE}>
          {warnings.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </EuiCallOut>
      )}
    </>
  );
};
