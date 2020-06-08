/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MetricsExplorerSeries } from '../../../../../common/http_api';

interface Props {
  series: MetricsExplorerSeries;
}

export const ChartTitle = ({ series }: Props) => {
  if (series.keys != null) {
    const { keys } = series;
    return (
      <EuiFlexGroup gutterSize="xs">
        {keys.map((name, i) => (
          <Fragment key={name}>
            <EuiFlexItem grow={false}>
              <EuiText size="m" color={keys.length - 1 > i ? 'subdued' : 'default'}>
                <strong>{name}</strong>
              </EuiText>
            </EuiFlexItem>
            {keys.length - 1 > i && (
              <EuiFlexItem grow={false}>
                <EuiText size="m" color="subdued">
                  <span>/</span>
                </EuiText>
              </EuiFlexItem>
            )}
          </Fragment>
        ))}
      </EuiFlexGroup>
    );
  }
  return <span>{series.id}</span>;
};
