/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { SocTrendsDatePickerLock } from './date_picker_lock';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { LastUpdatedAt } from '../utils';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import { CASES_MTTR_DESCRIPTION, CASES_MTTR_STAT, SOC_TRENDS } from '../translations';
import { useSocTrends } from './use_soc_trends';

const SOC_TRENDS_ID = 'socTrends';

const StyledEuiPanel = styled(EuiPanel)`
  min-width: 300px;
`;
const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  max-width: 300px;
`;

const SocTrendsComponent: React.FC = () => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(SOC_TRENDS_ID);
  const { casesMttr, percentage, isLoading, updatedAt } = useSocTrends({
    skip: !toggleStatus,
  });

  return (
    <StyledEuiPanel hasBorder>
      <HeaderSection
        id={SOC_TRENDS_ID}
        showInspectButton={false}
        stackHeader={true}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        title={SOC_TRENDS}
        titleSize="s"
        toggleQuery={setToggleStatus}
        toggleStatus={toggleStatus}
      >
        <StyledEuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <SuperDatePicker id="socTrends" showUpdateButton="iconOnly" width="auto" compressed />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SocTrendsDatePickerLock />
          </EuiFlexItem>
        </StyledEuiFlexGroup>
      </HeaderSection>
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
                      <EuiText>
                        <h6>
                          {CASES_MTTR_STAT} <EuiIcon type="questionInCircle" />
                        </h6>
                      </EuiText>
                    </EuiToolTip>
                  ),
                  description: isLoading ? (
                    <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
                  ) : (
                    <>
                      {casesMttr}{' '}
                      <EuiToolTip content={percentage.note}>
                        <EuiBadge color={percentage.color}>
                          {percentage.percent != null ? percentage.percent : '-'}
                        </EuiBadge>
                      </EuiToolTip>
                    </>
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
