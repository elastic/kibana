/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiButtonEmpty, EuiIconTip } from '@elastic/eui';
import { Case } from '../../../common/ui/types';
import { CaseStatuses, CaseType } from '../../../common/api';
import * as i18n from '../case_view/translations';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { Actions } from './actions';
import { CaseService } from '../../containers/use_get_case_user_actions';
import { StatusContextMenu } from './status_context_menu';
import { getStatusDate, getStatusTitle } from './helpers';
import { SyncAlertsSwitch } from '../case_settings/sync_alerts_switch';
import type { OnUpdateFields } from '../case_view/types';
import { useCasesFeatures } from '../cases_context/use_cases_features';

interface CaseActionBarProps {
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
    <div>
      {caseData.type !== CaseType.collection && (
        <>
          <StatusContextMenu
            currentStatus={caseData.status}
            disabled={!userCanCrud || isLoading}
            onStatusChanged={onStatusChanged}
          />
        </>
      )}
      {title}
      <FormattedRelativePreferenceDate
        data-test-subj={'case-action-bar-status-date'}
        value={date}
      />
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
          <Actions caseData={caseData} currentExternalIncident={currentExternalIncident} />
        </span>
      )}
    </div>
  );
};
CaseActionBarComponent.displayName = 'CaseActionBar';

export const CaseActionBar = React.memo(CaseActionBarComponent);
