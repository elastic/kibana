/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface BetaCallOutProps {
  description: string;
  title?: string;
}

export const BetaCallOut: React.FC<BetaCallOutProps> = ({ title, description }) => {
  return (
    <EuiCallOut
      color="warning"
      iconType="beaker"
      title={
        title ||
        i18n.translate('xpack.enterpriseSearch.betaCalloutTitle', {
          defaultMessage: 'Beta feature',
        })
      }
    >
      {description}
    </EuiCallOut>
  );
};
