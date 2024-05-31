/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

export const LocationsLoadingError = () => {
  return (
    <EuiEmptyPrompt
      iconType="warning"
      color="danger"
      title={
        <h3>
          {i18n.translate('xpack.synthetics.locations.error.label', {
            defaultMessage: 'Unable to load testing locations',
          })}
        </h3>
      }
      body={
        <p>
          {i18n.translate('xpack.synthetics.locations.error.content', {
            defaultMessage: 'There was an error loading testing locations. Please try again later.',
          })}
        </p>
      }
    />
  );
};
