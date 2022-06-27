/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const EmptyStateLoading = () => (
  <EuiEmptyPrompt
    body={
      <Fragment>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer />
        <EuiTitle size="l">
          <h2>
            {i18n.translate('xpack.synthetics.emptyState.loadingMessage', {
              defaultMessage: 'Loading…',
            })}
          </h2>
        </EuiTitle>
      </Fragment>
    }
  />
);
