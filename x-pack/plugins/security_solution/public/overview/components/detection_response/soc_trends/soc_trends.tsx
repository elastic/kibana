/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import prettyMilliseconds from 'pretty-ms';
import { LastUpdatedAt } from '../utils';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import { CASES_MTTR_DESCRIPTION, CASES_MTTR_STAT, SOC_TRENDS } from '../translations';
import { useSocTrends } from './use_soc_trends';

const SOC_TRENDS_ID = 'socTrends';

const StyledEuiPanel = styled(EuiPanel)`
  min-width: 300px;
`;

const SocTrendsComponent: React.FC = () => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(SOC_TRENDS_ID);
  const { casesMttr, isLoading, updatedAt } = useSocTrends({
    skip: !toggleStatus,
  });
  const casesMttrValue = useMemo(
    () =>
      casesMttr != null
        ? prettyMilliseconds(casesMttr * 1000, { compact: true, verbose: false })
        : '-',
    [casesMttr]
  );

  return (
    <StyledEuiPanel hasBorder>
      <HeaderSection
        id={SOC_TRENDS_ID}
        title={SOC_TRENDS}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        showInspectButton={false}
      />
      {!isLoading && toggleStatus && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={true}>
            <EuiDescriptionList
              data-test-subj={'casesMttrStatsHeader'}
              textStyle="reverse"
              listItems={[
                {
                  title: (
                    <EuiToolTip content={CASES_MTTR_DESCRIPTION}>
                      <>
                        {CASES_MTTR_STAT} <EuiIcon type="questionInCircle" />
                      </>
                    </EuiToolTip>
                  ),
                  description: isLoading ? (
                    <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
                  ) : (
                    casesMttrValue
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </StyledEuiPanel>
  );
};

export const SocTrends = React.memo(SocTrendsComponent);
