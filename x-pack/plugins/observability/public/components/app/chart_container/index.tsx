/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { EuiLoadingChartSize } from '@elastic/eui/src/components/loading/loading_chart';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';

interface Props {
  isLoading: boolean;
  height: number;
  width?: number;
  iconSize?: EuiLoadingChartSize;
  children: React.ReactNode;
}

export const ChartContainer = ({ isLoading, height, children, iconSize = 'xl', width }: Props) => {
  const theme = useContext(ThemeContext);
  const style = {
    height,
    marginTop: `-${height}px`,
    marginBottom: 0,
    width,
    opacity: 0.3,
    backgroundColor: theme.eui.euiColorFullShade,
    borderRadius: '4px',
  };
  return (
    <>
      <div style={{ height }}>{isLoading === false && children}</div>
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
