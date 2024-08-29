/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiIcon, EuiText, EuiHighlight, IconType } from '@elastic/eui';
import { css } from '@emotion/react';

export const ChartOption = ({
  option,
  searchValue = '',
}: {
  option: { label: string; description?: string; icon?: IconType };
  searchValue?: string;
}) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      css={css`
        text-align: left;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon className="lnsChartSwitch__chartIcon" type={option.icon || 'empty'} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="lnsChartSwitch-option-label">
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {option.description ? (
            <EuiHighlight search={searchValue}>{option.description}</EuiHighlight>
          ) : null}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
