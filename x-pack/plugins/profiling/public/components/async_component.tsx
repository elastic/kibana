/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AsyncState, AsyncStatus } from '../hooks/use_async';

export function AsyncComponent({
  children,
  status,
  error,
  mono,
  size,
  style,
  alignTop,
}: AsyncState<any> & {
  style?: React.ComponentProps<typeof EuiFlexGroup>['style'];
  children: React.ReactElement;
  mono?: boolean;
  size: 'm' | 'l' | 'xl';
  alignTop?: boolean;
}) {
  if (status === AsyncStatus.Settled && !error) {
    return children;
  }

  return (
    <EuiFlexGroup
      alignItems={alignTop ? 'flexStart' : 'center'}
      justifyContent="center"
      direction="row"
      style={style}
      gutterSize="none"
    >
      <EuiFlexItem grow={false} style={{ alignContent: 'center' }}>
        {error && status === AsyncStatus.Settled ? (
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <EuiIcon type="alert" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText style={{ whiteSpace: 'nowrap' }}>
                {i18n.translate('xpack.profiling.asyncComponent.errorLoadingData', {
                  defaultMessage: 'Could not load data',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiLoadingChart mono={mono} size={size} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
