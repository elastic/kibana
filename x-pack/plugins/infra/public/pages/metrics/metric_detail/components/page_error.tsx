/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { InvalidNodeError } from './invalid_node';
import { DocumentTitle } from '../../../../components/document_title';
import { ErrorPageBody } from '../../../error';
import { InfraHttpError } from '../../../../types';

interface Props {
  name: string;
  error: InfraHttpError;
}

export const PageError = ({ error, name }: Props) => {
  return (
    <>
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.metricDetailPage.documentTitleError', {
            defaultMessage: '{previousTitle} | Uh oh',
            values: {
              previousTitle,
            },
          })
        }
      />
      {error.body?.statusCode === 404 ? (
        <InvalidNodeError nodeName={name} />
      ) : (
        <ErrorPageBody message={error.message} />
      )}
    </>
  );
};
