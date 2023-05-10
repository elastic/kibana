/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { BetaCallOut } from './beta_callout';

export const BetaConnectorCallout: React.FC = () => (
  <BetaCallOut
    title={i18n.translate('xpack.enterpriseSearch.betaConnectorCalloutTitle', {
      defaultMessage: 'Beta connector',
    })}
    description={i18n.translate('xpack.enterpriseSearch.betaConnectorCalloutDescription', {
      defaultMessage:
        'This connector is a beta feature and we are committed to delivering in the product, but is not yet ready for general availability. Elastic will take a best effort approach to fix any issues, but features in beta are not subject to the support SLA of official GA features.',
    })}
  />
);
