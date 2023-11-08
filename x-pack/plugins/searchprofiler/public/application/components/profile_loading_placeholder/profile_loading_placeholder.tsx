/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

export const ProfileLoadingPlaceholder = () => {
  return (
    <EuiEmptyPrompt
      title={
        <h1>
          {i18n.translate('xpack.searchProfiler.profilingLoaderText', {
            defaultMessage: 'Loading query profiles...',
          })}
        </h1>
      }
    />
  );
};
