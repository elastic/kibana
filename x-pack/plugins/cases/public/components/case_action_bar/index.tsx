/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { Case } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
import * as i18n from '../case_view/translations';
import { Actions } from './actions';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { StatusContextMenu } from './status_context_menu';
import { SyncAlertsSwitch } from '../case_settings/sync_alerts_switch';
import type { OnUpdateFields } from '../case_view/types';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { getStatusDate, getStatusTitle } from './helpers';

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.m}) {
        padding-right: 0;
        border-right: 0;
      }
    }
  `}
`;

export interface CaseActionBarProps {
  caseData: Case;
  currentExternalIncident: CaseService | null;
  userCanCrud: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateField: (args: OnUpdateFields) => void;
}
const CaseActionBarComponent: React.FC<CaseActionBarProps> = ({
  caseData,
  currentExternalIncident,
  userCanCrud,
  isLoading,
  onRefresh,
  onUpdateField,
}) => {
  const { isSyncAlertsEnabled, metricsFeatures } = useCasesFeatures();
  const date = useMemo(() => getStatusDate(caseData), [caseData]);
  const title = useMemo(() => getStatusTitle(caseData.status), [caseData.status]);
  const onStatusChanged = useCallback(
    (status: CaseStatuses) =>
      onUpdateField({
        key: 'status',
        value: status,
      }),
    [onUpdateField]
  );

  const onSyncAlertsChanged = useCallback(
    (syncAlerts: boolean) =>
      onUpdateField({
        key: 'settings',
        value: { ...caseData.settings, syncAlerts },
      }),
    [caseData.settings, onUpdateField]
  );

  return (
    <EuiFlexGroup gutterSize="l" justifyContent="flexEnd" data-test-subj="case-action-bar-wrapper">
      <EuiFlexItem grow={false}>
        <MyDescriptionList compressed>
          <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false} data-test-subj="case-view-status">
              <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <StatusContextMenu
                  currentStatus={caseData.status}
                  disabled={!userCanCrud || isLoading}
                  onStatusChanged={onStatusChanged}
                />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
            {!metricsFeatures.includes('lifespan') ? (
              <EuiFlexItem grow={false}>
                <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <FormattedRelativePreferenceDate
                    data-test-subj={'case-action-bar-status-date'}
                    value={date}
                  />
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </MyDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed>
          <EuiFlexGroup
            gutterSize="l"
            alignItems="center"
            responsive={false}
            justifyContent="spaceBetween"
          >
            {userCanCrud && isSyncAlertsEnabled && (
              <EuiFlexItem grow={false}>
                <EuiDescriptionListTitle>
                  <EuiFlexGroup
                    component="span"
                    alignItems="center"
                    gutterSize="xs"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <span>{i18n.SYNC_ALERTS}</span>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip content={i18n.SYNC_ALERTS_HELP} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <SyncAlertsSwitch
                    disabled={isLoading}
                    isSynced={caseData.settings.syncAlerts}
                    onSwitchChange={onSyncAlertsChanged}
                  />
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <span>
                <EuiButtonEmpty
                  data-test-subj="case-refresh"
                  flush="left"
                  iconType="refresh"
                  onClick={onRefresh}
                >
                  {i18n.CASE_REFRESH}
                </EuiButtonEmpty>
              </span>
            </EuiFlexItem>
            {userCanCrud && (
              <EuiFlexItem grow={false} data-test-subj="case-view-actions">
                <Actions caseData={caseData} currentExternalIncident={currentExternalIncident} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
CaseActionBarComponent.displayName = 'CaseActionBar';

export const CaseActionBar = React.memo(CaseActionBarComponent);
