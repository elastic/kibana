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
import { i18n } from '@kbn/i18n';
import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { CommentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';

import { useKibana } from '../../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../../hooks/use_get_user_cases_permissions';
import { isAlertDetailsEnabledPerApp } from '../../../utils/is_alert_details_enabled';
import { parseAlert } from '../helpers/parse_alert';
import { paths } from '../../../config';
import { RULE_DETAILS_PAGE_ID } from '../../rule_details/constants';
import { ObservabilityRuleTypeRegistry } from '../../..';
import type { ConfigSchema } from '../../../plugin';
import type { TopAlert } from '../../../typings/alerts';

const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';

export interface Props {
  config: ConfigSchema;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventId: string;
  id?: string;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  setFlyoutAlert: React.Dispatch<React.SetStateAction<TopAlert | undefined>>;
}

export function AlertActions({
  config,
  data,
  ecsData,
  eventId,
  id: pageId,
  observabilityRuleTypeRegistry,
  setFlyoutAlert,
}: Props) {
  const {
    cases: {
      helpers: { getRuleIdFromEvent },
      hooks: { getUseCasesAddToNewCaseFlyout, getUseCasesAddToExistingCaseModal },
    },
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const userCasesPermissions = useGetUserCasesPermissions();

  const [openActionsPopoverId, setActionsPopover] = useState(null);

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const alert = parseObservabilityAlert(dataFieldEs);

  const closeActionsPopover = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const toggleActionsPopover = useCallback((id) => {
    setActionsPopover((current) => (current ? null : id));
  }, []);

  const ruleId = alert.fields['kibana.alert.rule.uuid'] ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId
      ? prepend(paths.observability.ruleDetails(ruleId))
      : null;
  const alertId = alert.fields['kibana.alert.uuid'] ?? null;
  const linkToAlert =
    pageId !== ALERT_DETAILS_PAGE_ID && alertId
      ? prepend(paths.observability.alertDetails(alertId))
      : null;

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: CommentType.alert,
            rule: getRuleIdFromEvent({ ecs: ecsData, data: data ?? [] }),
          },
        ]
      : [];
  }, [ecsData, getRuleIdFromEvent, data]);

  const createCaseFlyout = getUseCasesAddToNewCaseFlyout();

  const selectCaseModal = getUseCasesAddToExistingCaseModal();

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
              {i18n.translate('xpack.observability.alerts.actions.addToCase', {
                defaultMessage: 'Add to existing case',
              })}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              data-test-subj="add-to-new-case-action"
              onClick={handleAddToNewCaseClick}
              size="s"
            >
              {i18n.translate('xpack.observability.alerts.actions.addToNewCase', {
                defaultMessage: 'Add to new case',
              })}
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
              {i18n.translate('xpack.observability.alertsTable.viewRuleDetailsButtonText', {
                defaultMessage: 'View rule details',
              })}
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
            {i18n.translate('xpack.observability.alertsTable.viewAlertDetailsButtonText', {
              defaultMessage: 'View alert details',
            })}
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
            {i18n.translate('xpack.observability.alertsTable.viewAlertDetailsButtonText', {
              defaultMessage: 'View alert details',
            })}
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
      ? i18n.translate('xpack.observability.alertsTable.notEnoughPermissions', {
          defaultMessage: 'Additional privileges required',
        })
      : i18n.translate('xpack.observability.alertsTable.moreActionsTextLabel', {
          defaultMessage: 'More actions',
        });

  return (
    <>
      <EuiFlexItem>
        <EuiToolTip
          content={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
            defaultMessage: 'View in app',
          })}
        >
          <EuiButtonIcon
            size="s"
            href={prepend(alert.link ?? '')}
            iconType="eye"
            color="text"
            aria-label={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
              defaultMessage: 'View in app',
            })}
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
