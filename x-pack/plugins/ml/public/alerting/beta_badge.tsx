/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const BetaBadge: FC<{ message: string }> = ({ message }) => {
  return (
    <EuiFlexGroup gutterSize={'none'} justifyContent={'flexEnd'}>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label={i18n.translate('xpack.ml.anomalyDetectionAlert.betaBadgeLabel', {
            defaultMessage: 'Beta',
          })}
          tooltipContent={message}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
