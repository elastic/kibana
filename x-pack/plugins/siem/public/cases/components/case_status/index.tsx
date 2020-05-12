/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonToggle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from '../case_view/translations';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { CaseViewActions } from '../case_view/actions';
import { Case } from '../../containers/types';
import { CaseService } from '../../containers/use_get_case_user_actions';

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

interface CaseStatusProps {
  'data-test-subj': string;
  badgeColor: string;
  buttonLabel: string;
  caseData: Case;
  currentExternalIncident: CaseService | null;
  disabled?: boolean;
  icon: string;
  isLoading: boolean;
  isSelected: boolean;
  onRefresh: () => void;
  status: string;
  title: string;
  toggleStatusCase: (evt: unknown) => void;
  value: string | null;
}
const CaseStatusComp: React.FC<CaseStatusProps> = ({
  'data-test-subj': dataTestSubj,
  badgeColor,
  buttonLabel,
  caseData,
  currentExternalIncident,
  disabled = false,
  icon,
  isLoading,
  isSelected,
  onRefresh,
  status,
  title,
  toggleStatusCase,
  value,
}) => (
  <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <MyDescriptionList compressed>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiBadge color={badgeColor} data-test-subj="case-view-status">
                {status}
              </EuiBadge>
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
        <EuiFlexItem>
          <EuiButtonToggle
            data-test-subj="toggle-case-status"
            isDisabled={disabled}
            iconType={icon}
            isLoading={isLoading}
            isSelected={isSelected}
            label={buttonLabel}
            onChange={toggleStatusCase}
          />
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

export const CaseStatus = React.memo(CaseStatusComp);
