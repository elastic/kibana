/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiLoadingChartSize } from '@elastic/eui/src/components/loading/loading_chart';

interface Props {
  isLoading: boolean;
  height: number;
  width?: number;
  iconSize?: EuiLoadingChartSize;
  children: React.ReactNode;
}

export const ChartContainer = ({ isLoading, height, children, iconSize = 'xl', width }: Props) => {
  const style = { height, marginTop: `-${height}px`, marginBottom: 0, width };
  return (
    <>
      {children}
      {isLoading === true && (
        <EuiFlexGroup
          justifyContent="spaceAround"
          alignItems="center"
          style={style}
          data-test-subj="loading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size={iconSize} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
