/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

import { FlashMessages } from '../../../../shared/flash_messages';

export const AnalyticsUnavailable: React.FC = () => (
  <>
    <FlashMessages />
    <EuiEmptyPrompt
      iconType="visLine"
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.unavailable.title', {
            defaultMessage: 'Analytics are currently unavailable',
          })}
        </h2>
      }
      body={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.analytics.unavailable.description',
        { defaultMessage: 'Please try again in a few minutes.' }
      )}
    />
  </>
);
