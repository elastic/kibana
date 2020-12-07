/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CaseStatuses } from '../../../../../case/common/api';
import * as i18n from '../case_view/translations';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { CaseViewActions } from '../case_view/actions';
import { Case } from '../../containers/types';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { StatusContextMenu } from './status_context_menu';
import { getStatusDate, getStatusTitle } from './helpers';

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

interface CaseActionBarProps {
  caseData: Case;
  currentExternalIncident: CaseService | null;
  disabled?: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onStatusChanged: (status: CaseStatuses) => void;
}
const CaseActionBarComponent: React.FC<CaseActionBarProps> = ({
  caseData,
  currentExternalIncident,
  disabled = false,
  isLoading,
  onRefresh,
  onStatusChanged,
}) => {
  const date = useMemo(() => getStatusDate(caseData), [caseData]);
  const title = useMemo(() => getStatusTitle(caseData.status), [caseData.status]);

  return (
    <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <MyDescriptionList compressed>
          <EuiFlexGroup>
            <EuiFlexItem grow={false} data-test-subj="case-view-status">
              <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <StatusContextMenu
                  currentStatus={caseData.status}
                  onStatusChanged={onStatusChanged}
                />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <FormattedRelativePreferenceDate
                  data-test-subj={'case-action-bar-status-date'}
                  value={date}
                />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </MyDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem>
            <EuiButtonEmpty data-test-subj="case-refresh" iconType="refresh" onClick={onRefresh}>
              {i18n.CASE_REFRESH}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CaseViewActions
              caseData={caseData}
              currentExternalIncident={currentExternalIncident}
              disabled={disabled}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CaseActionBar = React.memo(CaseActionBarComponent);
