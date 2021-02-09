/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const UnavailablePrompt: React.FC = () => (
  <EuiEmptyPrompt
    iconType="clock"
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.unavailableTitle', {
          defaultMessage: 'Dashboard metrics are currently unavailable',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.unavailableBody', {
          defaultMessage: 'Please try again in a few minutes.',
        })}
      </p>
    }
  />
);
