/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDocumentTitle } from '../../../../hooks/use_document_title';
import { errorTitle } from '../../../../translations';
import { InfraHttpError } from '../../../../types';
import { ErrorPageBody } from '../../../error';
import { InvalidNodeError } from './invalid_node';

interface Props {
  name: string;
  error: InfraHttpError;
}

export const PageError = ({ error, name }: Props) => {
  useDocumentTitle([{ text: errorTitle }]);

  return (
    <>
      {error.body?.statusCode === 404 ? (
        <InvalidNodeError nodeName={name} />
      ) : (
        <ErrorPageBody message={error.message} />
      )}
    </>
  );
};
