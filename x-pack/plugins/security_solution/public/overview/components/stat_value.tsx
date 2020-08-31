/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiProgress, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { useUiSetting$ } from '../../common/lib/kibana';

const ProgressContainer = styled.div`
  margin-left: 8px;
  min-width: 100px;
`;

const LoadingContent = styled(EuiLoadingContent)`
  .euiLoadingContent__singleLine {
    margin-bottom: 0px;
  }
`;

const StatValueComponent: React.FC<{
  count: number;
  isGroupStat: boolean;
  isLoading: boolean;
  max: number;
}> = ({ count, isGroupStat, isLoading, max }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (isInitialLoading && !isLoading) {
      setIsInitialLoading(false);
    }
  }, [isLoading, isInitialLoading, setIsInitialLoading]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        {!isInitialLoading && (
          <EuiText color={isGroupStat ? 'default' : 'subdued'} size={isGroupStat ? 'm' : 's'}>
            {numeral(count).format(defaultNumberFormat)}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <ProgressContainer>
          {isLoading ? (
            <LoadingContent data-test-subj="stat-value-loading-spinner" lines={1} />
          ) : (
            <EuiProgress
              color={isGroupStat ? 'primary' : 'subdued'}
              max={max}
              size="m"
              value={count}
            />
          )}
        </ProgressContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

StatValueComponent.displayName = 'StatValueComponent';

export const StatValue = React.memo(StatValueComponent);
