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
        'This connector is in beta. Beta features are subject to change and are not covered by the support SLA of general release (GA) features. Elastic plans to promote this feature to GA in a future release.',
    })}
  />
);
