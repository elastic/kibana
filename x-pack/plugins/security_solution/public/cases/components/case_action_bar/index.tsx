/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CaseStatus } from '../../../../../case/common/api';
import * as i18n from '../case_view/translations';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { CaseViewActions } from '../case_view/actions';
import { Case } from '../../containers/types';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { StatusContextMenu } from './status_context_menu';

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

interface CaseActionBarProps {
  'data-test-subj': string;
  badgeColor: string;
  caseData: Case;
  currentExternalIncident: CaseService | null;
  disabled?: boolean;
  isLoading: boolean;
  isSelected: boolean;
  onRefresh: () => void;
  status: CaseStatus;
  title: string;
  onStatusChanged: (status: CaseStatus) => void;
  value: string | null;
}
const CaseActionBarComponent: React.FC<CaseActionBarProps> = ({
  'data-test-subj': dataTestSubj,
  badgeColor,
  caseData,
  currentExternalIncident,
  disabled = false,
  isLoading,
  isSelected,
  onRefresh,
  status,
  title,
  onStatusChanged,
  value,
}) => {
  return (
    <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <MyDescriptionList compressed>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <StatusContextMenu currentStatus={status} onStatusChanged={onStatusChanged} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <FormattedRelativePreferenceDate data-test-subj={dataTestSubj} value={value} />
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
