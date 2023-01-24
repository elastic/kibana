/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import React, { useMemo, useState, useCallback } from 'react';

import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { CommentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { isAlertDetailsEnabledPerApp } from '../../../utils/is_alert_details_enabled';
import { useKibana } from '../../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../../hooks/use_get_user_cases_permissions';
import { parseAlert } from './parse_alert';
import { translations, paths } from '../../../config';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../containers/alerts_table/translations';
import { ObservabilityAppServices } from '../../../application/types';
import { RULE_DETAILS_PAGE_ID } from '../../rule_details/constants';
import type { TopAlert } from '../containers/alerts_page/types';
import { ObservabilityRuleTypeRegistry } from '../../..';
import { ALERT_DETAILS_PAGE_ID } from '../../alert_details/types';
import { ConfigSchema } from '../../../plugin';

export interface ObservabilityActionsProps {
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventId: string;
  setFlyoutAlert: React.Dispatch<React.SetStateAction<TopAlert | undefined>>;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  id?: string;
  config: ConfigSchema;
}

export function ObservabilityActions({
  data,
  eventId,
  ecsData,
  id: pageId,
  observabilityRuleTypeRegistry,
  config,
  setFlyoutAlert,
}: ObservabilityActionsProps) {
  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const [openActionsPopoverId, setActionsPopover] = useState(null);
  const { cases, http } = useKibana<ObservabilityAppServices>().services;

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const alert = parseObservabilityAlert(dataFieldEs);

  const closeActionsPopover = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const toggleActionsPopover = useCallback((id) => {
    setActionsPopover((current) => (current ? null : id));
  }, []);

  const userCasesPermissions = useGetUserCasesPermissions();
  const ruleId = alert.fields['kibana.alert.rule.uuid'] ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId
      ? http.basePath.prepend(paths.observability.ruleDetails(ruleId))
      : null;
  const alertId = alert.fields['kibana.alert.uuid'] ?? null;
  const linkToAlert =
    pageId !== ALERT_DETAILS_PAGE_ID && alertId
      ? http.basePath.prepend(paths.observability.alertDetails(alertId))
      : null;
  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: CommentType.alert,
            rule: cases.helpers.getRuleIdFromEvent({ ecs: ecsData, data: data ?? [] }),
          },
        ]
      : [];
  }, [ecsData, cases.helpers, data]);

  const createCaseFlyout = cases.hooks.getUseCasesAddToNewCaseFlyout();

  const selectCaseModal = cases.hooks.getUseCasesAddToExistingCaseModal();

  const handleAddToNewCaseClick = useCallback(() => {
    createCaseFlyout.open({ attachments: caseAttachments });
    closeActionsPopover();
  }, [createCaseFlyout, caseAttachments, closeActionsPopover]);

  const handleAddToExistingCaseClick = useCallback(() => {
    selectCaseModal.open({ attachments: caseAttachments });
    closeActionsPopover();
  }, [caseAttachments, closeActionsPopover, selectCaseModal]);
  const actionsMenuItems = useMemo(() => {
    return [
      ...(userCasesPermissions.create && userCasesPermissions.read
        ? [
            <EuiContextMenuItem
              data-test-subj="add-to-existing-case-action"
              onClick={handleAddToExistingCaseClick}
              size="s"
            >
              {ADD_TO_EXISTING_CASE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              data-test-subj="add-to-new-case-action"
              onClick={handleAddToNewCaseClick}
              size="s"
            >
              {ADD_TO_NEW_CASE}
            </EuiContextMenuItem>,
          ]
        : []),

      ...(!!linkToRule
        ? [
            <EuiContextMenuItem
              key="viewRuleDetails"
              data-test-subj="viewRuleDetails"
              href={linkToRule}
            >
              {translations.alertsTable.viewRuleDetailsButtonText}
            </EuiContextMenuItem>,
          ]
        : []),

      ...[
        isAlertDetailsEnabledPerApp(alert, config) && linkToAlert ? (
          <EuiContextMenuItem
            key="viewAlertDetailsPage"
            data-test-subj="viewAlertDetailsPage"
            href={linkToAlert}
          >
            {translations.alertsTable.viewAlertDetailsButtonText}
          </EuiContextMenuItem>
        ) : (
          <EuiContextMenuItem
            key="viewAlertDetailsFlyout"
            data-test-subj="viewAlertDetailsFlyout"
            onClick={() => {
              closeActionsPopover();
              setFlyoutAlert(alert);
            }}
          >
            {translations.alertsTable.viewAlertDetailsButtonText}
          </EuiContextMenuItem>
        ),
      ],
    ];
  }, [
    userCasesPermissions.create,
    userCasesPermissions.read,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    linkToRule,
    alert,
    config,
    linkToAlert,
    closeActionsPopover,
    setFlyoutAlert,
  ]);

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? translations.alertsTable.notEnoughPermissions
      : translations.alertsTable.moreActionsTextLabel;

  return (
    <>
      <EuiFlexItem>
        <EuiToolTip content={translations.alertsTable.viewInAppTextLabel}>
          <EuiButtonIcon
            size="s"
            href={http.basePath.prepend(alert.link ?? '')}
            iconType="eye"
            color="text"
            aria-label={translations.alertsTable.viewInAppTextLabel}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPopover
          button={
            <EuiToolTip content={actionsToolTip}>
              <EuiButtonIcon
                display="empty"
                size="s"
                color="text"
                iconType="boxesHorizontal"
                aria-label={actionsToolTip}
                onClick={() => toggleActionsPopover(eventId)}
                data-test-subj="alertsTableRowActionMore"
              />
            </EuiToolTip>
          }
          isOpen={openActionsPopoverId === eventId}
          closePopover={closeActionsPopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel size="s" items={actionsMenuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
}
