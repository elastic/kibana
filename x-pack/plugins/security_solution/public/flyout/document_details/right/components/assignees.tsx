/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { ASSIGNEES_PANEL_WIDTH } from '../../../../common/components/assignees/constants';
import { AssigneesApplyPanel } from '../../../../common/components/assignees/assignees_apply_panel';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';
import { useLicense } from '../../../../common/hooks/use_license';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { UsersAvatarsPanel } from '../../../../common/components/user_profiles/users_avatars_panel';
import {
  ASSIGNEES_ADD_BUTTON_TEST_ID,
  ASSIGNEES_HEADER_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
} from './test_ids';

const UpdateAssigneesButton: FC<{
  isDisabled: boolean;
  toolTipMessage: string;
  togglePopover: () => void;
}> = memo(({ togglePopover, isDisabled, toolTipMessage }) => (
  <EuiToolTip position="bottom" content={toolTipMessage}>
    <EuiButtonIcon
      aria-label="Update assignees"
      data-test-subj={ASSIGNEES_ADD_BUTTON_TEST_ID}
      iconType={'plusInCircle'}
      onClick={togglePopover}
      isDisabled={isDisabled}
    />
  </EuiToolTip>
));
UpdateAssigneesButton.displayName = 'UpdateAssigneesButton';

export interface AssigneesProps {
  /**
   * Id of the document
   */
  eventId: string;

  /**
   * The array of ids of the users assigned to the alert
   */
  assignedUserIds: string[];

  /**
   * Callback to handle the successful assignees update
   */
  onAssigneesUpdated?: () => void;

  /**
   * Boolean to indicate whether it is a preview flyout
   */
  isPreview?: boolean;
}

/**
 * Document assignees details displayed in flyout right section header
 */
export const Assignees: FC<AssigneesProps> = memo(
  ({ eventId, assignedUserIds, onAssigneesUpdated, isPreview }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const upsellingMessage = useUpsellingMessage('alert_assignments');

    const { hasIndexWrite } = useAlertsPrivileges();
    const setAlertAssignees = useSetAlertAssignees();

    const uids = useMemo(() => new Set(assignedUserIds), [assignedUserIds]);
    const { data: assignedUsers } = useBulkGetUserProfiles({ uids });

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onSuccess = useCallback(() => {
      if (onAssigneesUpdated) onAssigneesUpdated();
    }, [onAssigneesUpdated]);

    const togglePopover = useCallback(() => {
      setIsPopoverOpen((value) => !value);
    }, []);

    const handleApplyAssignees = useCallback(
      async (assignees) => {
        setIsPopoverOpen(false);
        if (setAlertAssignees) {
          await setAlertAssignees(assignees, [eventId], onSuccess, noop);
        }
      },
      [eventId, onSuccess, setAlertAssignees]
    );

    const searchInputId = useGeneratedHtmlId({
      prefix: 'searchInput',
    });

    const updateAssigneesPopover = useMemo(() => {
      return (
        <EuiPopover
          panelPaddingSize="none"
          initialFocus={`#${searchInputId}`}
          button={
            <UpdateAssigneesButton
              togglePopover={togglePopover}
              isDisabled={!hasIndexWrite || !isPlatinumPlus}
              toolTipMessage={
                upsellingMessage ??
                i18n.translate(
                  'xpack.securitySolution.flyout.right.visualizations.assignees.popoverTooltip',
                  {
                    defaultMessage: 'Assign alert',
                  }
                )
              }
            />
          }
          isOpen={isPopoverOpen}
          panelStyle={{
            minWidth: ASSIGNEES_PANEL_WIDTH,
          }}
          closePopover={togglePopover}
        >
          <AssigneesApplyPanel
            searchInputId={searchInputId}
            assignedUserIds={assignedUserIds}
            onApply={handleApplyAssignees}
          />
        </EuiPopover>
      );
    }, [
      assignedUserIds,
      handleApplyAssignees,
      hasIndexWrite,
      isPlatinumPlus,
      isPopoverOpen,
      searchInputId,
      togglePopover,
      upsellingMessage,
    ]);

    return (
      <EuiFlexGroup
        data-test-subj={ASSIGNEES_HEADER_TEST_ID}
        direction="column"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs" data-test-subj={ASSIGNEES_TITLE_TEST_ID}>
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.header.assignedTitle"
                defaultMessage="Assignees"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {isPreview ? (
          getEmptyTagValue()
        ) : (
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {assignedUsers && (
              <EuiFlexItem grow={false}>
                <UsersAvatarsPanel userProfiles={assignedUsers} maxVisibleAvatars={2} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{updateAssigneesPopover}</EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    );
  }
);

Assignees.displayName = 'Assignees';
