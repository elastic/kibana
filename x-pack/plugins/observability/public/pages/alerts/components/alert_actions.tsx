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

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { CommentType } from '@kbn/cases-plugin/common';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';

import { useKibana } from '../../../utils/kibana_react';
import { useGetUserCasesPermissions } from '../../../hooks/use_get_user_cases_permissions';
import { isAlertDetailsEnabledPerApp } from '../../../utils/is_alert_details_enabled';
import { parseAlert } from '../helpers/parse_alert';
import { paths } from '../../../config/paths';
import { RULE_DETAILS_PAGE_ID } from '../../rule_details/constants';
import type { ObservabilityRuleTypeRegistry } from '../../..';
import type { ConfigSchema } from '../../../plugin';
import type { TopAlert } from '../../../typings/alerts';

const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';

export interface Props {
  config: ConfigSchema;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  id?: string;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  setFlyoutAlert: React.Dispatch<React.SetStateAction<TopAlert | undefined>>;
}

export function AlertActions({
  config,
  data,
  ecsData,
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
  const createCaseFlyout = getUseCasesAddToNewCaseFlyout();
  const selectCaseModal = getUseCasesAddToExistingCaseModal();

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const alert = parseObservabilityAlert(dataFieldEs);

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

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
    selectCaseModal.open({ attachments: caseAttachments });
    closeActionsPopover();
  };

  const actionsMenuItems = [
    ...(userCasesPermissions.create && userCasesPermissions.read
      ? [
          <EuiContextMenuItem
            data-test-subj="add-to-existing-case-action"
            key="addToExistingCase"
            onClick={handleAddToExistingCaseClick}
            size="s"
          >
            {i18n.translate('xpack.observability.alerts.actions.addToCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="add-to-new-case-action"
            key="addToNewCase"
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
            data-test-subj="viewRuleDetails"
            key="viewRuleDetails"
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
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          href={linkToAlert}
        >
          {i18n.translate('xpack.observability.alertsTable.viewAlertDetailsButtonText', {
            defaultMessage: 'View alert details',
          })}
        </EuiContextMenuItem>
      ) : (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsFlyout"
          key="viewAlertDetailsFlyout"
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
            aria-label={i18n.translate('xpack.observability.alertsTable.viewInAppTextLabel', {
              defaultMessage: 'View in app',
            })}
            color="text"
            href={prepend(alert.link ?? '')}
            iconType="eye"
            size="s"
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem>
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
          <EuiContextMenuPanel size="s" items={actionsMenuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
}
