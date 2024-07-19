/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedNumber } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiHealth, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { GetIndicesIndexData } from '../../../common/types';

export interface IndexListItemMetricsProps {
  index: GetIndicesIndexData;
}
export const IndexListItemMetrics = ({ index }: IndexListItemMetricsProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <>
        <EuiIcon type="document" size="s" />
        <EuiText size="xs">
          <FormattedNumber value={index.count} notation="compact" />
        </EuiText>
        <EuiSpacer size="s" />
      </>
      {index.health ? <EuiHealth color={index.health} /> : null}
    </EuiFlexGroup>
  );
};
