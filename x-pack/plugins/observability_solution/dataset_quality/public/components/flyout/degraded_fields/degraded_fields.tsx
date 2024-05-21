/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiTitle, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { flyoutImprovementText, flyoutImprovementTooltip } from '../../../../common/translations';
import { DegradedFieldTable } from './table';

export function DegradedFields() {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" direction="column">
        <EuiFlexItem
          css={css`
            flex-direction: row;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 4px;
          `}
        >
          <EuiTitle size="xxxs">
            <h6>{flyoutImprovementText}</h6>
          </EuiTitle>
          <EuiToolTip content={flyoutImprovementTooltip}>
            <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <DegradedFieldTable />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
