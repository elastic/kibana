/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  enterpriseSearchVersion?: string;
  kibanaVersion?: string;
}

export const VersionMismatchError: React.FC<Props> = ({
  enterpriseSearchVersion,
  kibanaVersion,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="danger"
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.versionMismatch.title', {
            defaultMessage: 'Incompatible version error',
          })}
        </h2>
      }
      titleSize="l"
      body={
        <>
          {i18n.translate('xpack.enterpriseSearch.versionMismatch.body', {
            defaultMessage:
              'Your Kibana and Enterprise Search versions do not match. To access Enterprise Search, use the same major and minor version for each service.',
          })}
          <EuiSpacer />
          <div>
            {i18n.translate('xpack.enterpriseSearch.versionMismatch.enterpriseSearchVersionText', {
              defaultMessage: 'Enterprise Search version: {enterpriseSearchVersion}',
              values: { enterpriseSearchVersion },
            })}
          </div>
          <div>
            {i18n.translate('xpack.enterpriseSearch.versionMismatch.kibanaVersionText', {
              defaultMessage: 'Kibana version: {kibanaVersion}',
              values: { kibanaVersion },
            })}
          </div>
        </>
      }
    />
  );
};
