/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';
import { Case } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
import * as i18n from '../case_view/translations';
import { CASE_OPENED_BY } from '../../components/status/translations';
import { Actions } from './actions';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { StatusContextMenu } from './status_context_menu';
import { SyncAlertsSwitch } from '../case_settings/sync_alerts_switch';
import type { OnUpdateFields } from '../case_view/types';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { getStatusDate } from './helpers';

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
  const { isSyncAlertsEnabled } = useCasesFeatures();
  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);
  const date = useMemo(() => getStatusDate(caseData), [caseData]);
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
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiText size="s">
          <p>
            {CASE_OPENED_BY} <strong>{caseData.createdBy.username}</strong>
          </p>
        </EuiText>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedRelativePreferenceDate
              data-test-subj={'case-action-bar-status-date'}
              value={date}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <StatusContextMenu
              currentStatus={caseData.status}
              disabled={!userCanCrud || isLoading}
              onStatusChanged={onStatusChanged}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              isOpen={isActionPopoverOpen}
              closePopover={() => setIsActionPopoverOpen(false)}
              onClick={() => setIsActionPopoverOpen(!isActionPopoverOpen)}
              button={
                <EuiButtonIcon
                  display="base"
                  size="s"
                  iconType="boxesHorizontal"
                  aria-label="More actions"
                />
              }
            >
              <>
                {userCanCrud && isSyncAlertsEnabled && (
                  <>
                    <span>{i18n.SYNC_ALERTS}</span>
                    <EuiIconTip content={i18n.SYNC_ALERTS_HELP} />
                    <SyncAlertsSwitch
                      disabled={isLoading}
                      isSynced={caseData.settings.syncAlerts}
                      onSwitchChange={onSyncAlertsChanged}
                    />
                  </>
                )}
                <EuiButtonEmpty
                  data-test-subj="case-refresh"
                  flush="left"
                  iconType="refresh"
                  onClick={onRefresh}
                >
                  {i18n.CASE_REFRESH}
                </EuiButtonEmpty>
                {userCanCrud && (
                  <span data-test-subj="case-view-actions">
                    <Actions
                      caseData={caseData}
                      currentExternalIncident={currentExternalIncident}
                    />
                  </span>
                )}
              </>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
CaseActionBarComponent.displayName = 'CaseActionBar';

export const CaseActionBar = React.memo(CaseActionBarComponent);
