/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiRadio, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';

const MonitorTypeLabel = () => {
  return (
    <span style={{ width: '100%', height: '100%' }}>
      <EuiFlexGroup gutterSize="none" style={{ height: '100%' }} component="span">
        <EuiFlexItem component="span" style={{ justifyContent: 'center' }}>
          <span>
            <EuiFlexGroup
              direction="column"
              gutterSize="m"
              alignItems="center"
              justifyContent="center"
              component="span"
            >
              <EuiFlexItem component="span">
                <EuiIcon type="heartbeatApp" size="l" />
              </EuiFlexItem>
              <EuiFlexItem component="span">
                <EuiText size="xs">Stuff</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};

export const MonitorType = ({ name }: { name: string }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiRadio
      css={css`
        & {
          width: 86px;
          height: 86px;
          background-color: ${euiTheme.colors.lightestShade};
        }
        & .euiRadio__label {
          width: 100%;
          height: 100%;
        }
        & .euiRadio__input + .euiRadio__circle {
          top: 5px;
          right: 5px;
          left: initial;
        }
        & .euiRadio__input ~ .euiRadio__label {
          padding-left: 0;
        }
      `}
      label={<MonitorTypeLabel />}
      id="test"
      name={name}
      onChange={() => {}}
    />
  );
};
