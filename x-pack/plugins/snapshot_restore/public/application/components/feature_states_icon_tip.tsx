/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FeatureStatesIconTip: FunctionComponent = () => {
  return (
    <EuiIconTip
      type="questionInCircle"
      content={
        <span>
          <FormattedMessage
            id="xpack.snapshotRestore.featureStatesIconTooltip"
            defaultMessage="A feature state contains the indices, system indices and data streams used to store configurations, history, and other data for an Elastic feature."
          />
        </span>
      }
      iconProps={{
        className: 'eui-alignTop',
      }}
    />
  );
};
