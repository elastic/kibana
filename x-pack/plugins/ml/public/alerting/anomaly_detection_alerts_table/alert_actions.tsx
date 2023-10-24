/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { useBulkUntrackAlerts } from '@kbn/triggers-actions-ui-plugin/public';
import { type Alert } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { useMlKibana } from '../../application/contexts/kibana';

export interface AlertActionsProps {
  alert: Alert;
  ecsData: Ecs;
  id?: string;
  refresh: () => void;
  setFlyoutAlert: React.Dispatch<React.SetStateAction<any | undefined>>;
}

export function AlertActions({
  alert,
  ecsData,
  id: pageId,
  refresh,
  setFlyoutAlert,
}: AlertActionsProps) {
  const {
    cases,
    http: {
      basePath: { prepend },
    },
  } = useMlKibana().services;
  const casesPrivileges = cases?.helpers.canUseCases();

  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const ruleId = alert[ALERT_RULE_UUID]?.[0] ?? null;
  const alertId = alert[ALERT_UUID]?.[0] ?? '';

  const linkToRule = ruleId
    ? prepend(`/app/management/insightsAndAlerting/triggersActions/rule/${ruleId}`)
    : null;

  const data = useMemo(() => {
    return Object.entries(alert).reduce<TimelineNonEcsData[]>(
      (acc, [field, value]) => [...acc, { field, value: value as string[] }],
      []
    );
  }, [alert]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: cases?.helpers.getRuleIdFromEvent({
              ecs: ecsData,
              data,
            })!,
          },
        ]
      : [];
  }, [ecsData, cases, data]);

  const isActiveAlert = useMemo(() => alert[ALERT_STATUS]![0] === ALERT_STATUS_ACTIVE, [alert]);

  const onSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const createCaseFlyout = cases!.hooks.useCasesAddToNewCaseFlyout({ onSuccess });
  const selectCaseModal = cases!.hooks.useCasesAddToExistingCaseModal({ onSuccess });

  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout.open({ attachments: caseAttachments });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal.open({ getAttachments: () => caseAttachments });
    closeActionsPopover();
  };

  const handleUntrackAlert = useCallback(async () => {
    await untrackAlerts({
      indices: [ecsData?._index ?? ''],
      alertUuids: [alertId],
    });
    onSuccess();
  }, [untrackAlerts, alertId, ecsData, onSuccess]);

  const actionsMenuItems = [
    ...(casesPrivileges?.create && casesPrivileges.read
      ? [
          <EuiContextMenuItem
            data-test-subj="add-to-existing-case-action"
            key="addToExistingCase"
            onClick={handleAddToExistingCaseClick}
            size="s"
          >
            {i18n.translate('xpack.ml.alerts.actions.addToCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="add-to-new-case-action"
            key="addToNewCase"
            onClick={handleAddToNewCaseClick}
            size="s"
          >
            {i18n.translate('xpack.ml.alerts.actions.addToNewCase', {
              defaultMessage: 'Add to new case',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(casesPrivileges?.update && linkToRule
      ? [
          <EuiContextMenuItem
            data-test-subj="viewRuleDetails"
            key="viewRuleDetails"
            href={linkToRule}
          >
            {i18n.translate('xpack.ml.alertsTable.viewRuleDetailsButtonText', {
              defaultMessage: 'View rule details',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(isActiveAlert
      ? [
          <EuiContextMenuItem
            data-test-subj="untrackAlert"
            key="untrackAlert"
            onClick={handleUntrackAlert}
          >
            {i18n.translate('xpack.ml.alerts.actions.untrack', {
              defaultMessage: 'Mark as untracked',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? i18n.translate('xpack.ml.alertsTable.notEnoughPermissions', {
          defaultMessage: 'Additional privileges required',
        })
      : i18n.translate('xpack.ml.alertsTable.moreActionsTextLabel', {
          defaultMessage: 'More actions',
        });

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiToolTip content={actionsToolTip}>
            <EuiButtonIcon
              aria-label={actionsToolTip}
              color="text"
              data-test-subj="alertsTableRowActionMore"
              display="empty"
              iconType="boxesHorizontal"
              onClick={toggleActionsPopover}
              size="s"
            />
          </EuiToolTip>
        }
        closePopover={closeActionsPopover}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          size="s"
          items={actionsMenuItems}
          data-test-subj="alertsTableActionsMenu"
        />
      </EuiPopover>
    </>
  );
}
