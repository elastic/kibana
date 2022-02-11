/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';

export interface SingleMetricProps {
  alignLnsMetric?: string;
  children: JSX.Element;
  disableBorder?: boolean;
  disableShadow?: boolean;
  metricIcon?: string;
  metricIconColor?: string;
  metricPostfix?: string;
}

export function SingleMetric({
  alignLnsMetric = 'flex-start',
  children,
  disableBorder = true,
  disableShadow = true,
  metricIcon,
  metricIconColor,
  metricPostfix,
}: SingleMetricProps) {
  let metricMaxWidth = '100%';
  metricMaxWidth = metricIcon ? metricMaxWidth : `${metricMaxWidth} - 30px`;
  metricMaxWidth = metricPostfix ? metricMaxWidth : `${metricMaxWidth} - 120px`;

  return (
    <LensWrapper
      gutterSize="none"
      $alignLnsMetric={alignLnsMetric}
      $disableBorder={disableBorder}
      $disableShadow={disableShadow}
    >
      {metricIcon && (
        <EuiFlexItem style={{ justifyContent: 'space-evenly', paddingTop: '24px' }} grow={false}>
          <EuiIcon type={metricIcon} size="l" color={metricIconColor} />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        style={{ maxWidth: `calc(${metricMaxWidth})` }}
        grow={metricIcon && metricPostfix ? false : 1}
      >
        {children}
      </EuiFlexItem>
      {metricPostfix && (
        <EuiFlexItem style={{ justifyContent: 'space-evenly', paddingTop: '24px' }} grow={false}>
          <EuiTitle size="s">
            <h3> {metricPostfix}</h3>
          </EuiTitle>
        </EuiFlexItem>
      )}
    </LensWrapper>
  );
}

const LensWrapper = styled(EuiFlexGroup)<{
  $alignLnsMetric?: string;
  $disableBorder?: boolean;
  $disableShadow?: boolean;
}>`
  .embPanel__optionsMenuPopover {
    visibility: collapse;
  }
  .embPanel--editing {
    background-color: transparent;
  }
  ${(props) =>
    props.$disableBorder
      ? `.embPanel--editing {
    border: 0;
  }`
      : ''}
  &&&:hover {
    .embPanel__optionsMenuPopover {
      visibility: visible;
    }
    ${(props) =>
      props.$disableShadow
        ? `.embPanel--editing {
      box-shadow: none;
    }`
        : ''}
  }
  .embPanel__title {
    display: none;
  }
  ${(props) =>
    props.$alignLnsMetric
      ? `.lnsMetricExpression__container {
    align-items: ${props.$alignLnsMetric};
  }`
      : ''}
`;
