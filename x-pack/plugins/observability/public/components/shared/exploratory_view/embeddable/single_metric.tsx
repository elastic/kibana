/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, IconType } from '@elastic/eui';
import styled from 'styled-components';

export interface SingleMetricOptions {
  alignLnsMetric?: string;
  disableBorder?: boolean;
  disableShadow?: boolean;
  metricIcon?: IconType;
  metricIconColor?: string;
  metricIconWidth?: string;
  metricPostfix?: string;
  metricPostfixWidth?: string;
}

type SingleMetricProps = SingleMetricOptions & {
  children?: JSX.Element;
};

export function SingleMetric({
  alignLnsMetric = 'flex-start',
  children,
  disableBorder = true,
  disableShadow = true,
  metricIcon,
  metricIconColor,
  metricIconWidth = '30px',
  metricPostfix,
  metricPostfixWidth = '150px',
}: SingleMetricProps) {
  let metricMaxWidth = '100%';
  metricMaxWidth = metricIcon ? `${metricMaxWidth} - ${metricIconWidth}` : metricMaxWidth;
  metricMaxWidth = metricPostfix ? `${metricMaxWidth} - ${metricPostfixWidth}` : metricMaxWidth;

  return (
    <LensWrapper
      data-test-subj="single-metric-wrapper"
      gutterSize="none"
      $alignLnsMetric={alignLnsMetric}
      $disableBorder={disableBorder}
      $disableShadow={disableShadow}
    >
      {metricIcon && (
        <EuiFlexItem style={{ justifyContent: 'space-evenly', paddingTop: '24px' }} grow={false}>
          <EuiIcon
            type={metricIcon}
            size="l"
            color={metricIconColor}
            data-test-subj="single-metric-icon"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        style={{ maxWidth: `calc(${metricMaxWidth})` }}
        grow={1}
        data-test-subj="single-metric"
      >
        {children}
      </EuiFlexItem>
      {metricPostfix && (
        <EuiFlexItem
          style={{
            justifyContent: 'space-evenly',
            paddingTop: '24px',
            maxWidth: metricPostfixWidth,
            minWidth: 0,
          }}
          grow={false}
          data-test-subj="single-metric-postfix"
        >
          <StyledTitle size="m">
            <h3>{metricPostfix}</h3>
          </StyledTitle>
        </EuiFlexItem>
      )}
    </LensWrapper>
  );
}

const StyledTitle = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

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
    align-items: ${props.$alignLnsMetric ?? 'flex-start'};
  }`
      : ''}
`;
