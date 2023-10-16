/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserAvatar } from '@kbn/user-profile-components';
import { noop } from 'lodash';
import { useGetUserProfiles } from '../../../../detections/containers/detection_engine/alerts/use_get_user_profiles';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import {
  ASSIGNEE_AVATAR_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
  ASSIGNEES_VALUE_TEST_ID,
  ASSIGNEES_COUNT_BADGE_TEST_ID,
} from './test_ids';
import { AssigneesPopover } from './assignees_popover';

export interface AssigneesProps {
  eventId: string;
  alertAssignees: string[];
  onAssigneesUpdated?: () => void;
}

/**
 * Document details assignees displayed in flyout right section header
 */
export const Assignees: FC<AssigneesProps> = memo(
  ({ eventId, alertAssignees, onAssigneesUpdated }) => {
    const { userProfiles } = useGetUserProfiles(alertAssignees);
    const setAlertAssignees = useSetAlertAssignees();

    const assignees = userProfiles?.filter((user) => alertAssignees.includes(user.uid)) ?? [];

    const [selectedAssignees, setSelectedAssignees] = useState<string[] | undefined>();
    const [needToUpdateAssignees, setNeedToUpdateAssignees] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onSuccess = useCallback(() => {
      if (onAssigneesUpdated) onAssigneesUpdated();
    }, [onAssigneesUpdated]);

    const handleOnAlertAssigneesSubmit = useCallback(async () => {
      if (setAlertAssignees && selectedAssignees) {
        const existingIds = alertAssignees;
        const updatedIds = selectedAssignees;

        const assigneesToAddArray = updatedIds.filter((uid) => !existingIds.includes(uid));
        const assigneesToRemoveArray = existingIds.filter((uid) => !updatedIds.includes(uid));

        const assigneesToUpdate = {
          assignees_to_add: assigneesToAddArray,
          assignees_to_remove: assigneesToRemoveArray,
        };

        await setAlertAssignees(assigneesToUpdate, [eventId], onSuccess, noop);
      }
    }, [alertAssignees, eventId, onSuccess, selectedAssignees, setAlertAssignees]);

    const togglePopover = useCallback(() => {
      setIsPopoverOpen((value) => !value);
      setNeedToUpdateAssignees(true);
    }, []);

    const onClosePopover = useCallback(() => {
      // Order matters here because needToUpdateAssignees will likely be true already
      // from the togglePopover call when opening the popover, so if we set the popover to false
      // first, we'll get a rerender and then get another after we set needToUpdateAssignees to true again
      setNeedToUpdateAssignees(true);
      setIsPopoverOpen(false);
    }, []);

    const onUsersChange = useCallback((users: string[]) => {
      setSelectedAssignees(users);
    }, []);

    useEffect(() => {
      // selectedAssignees will be undefined on initial render or a rerender occurs, so we only want to update the assignees
      // after the users have been changed in some manner not when it is an initial value
      if (isPopoverOpen === false && needToUpdateAssignees && selectedAssignees) {
        setNeedToUpdateAssignees(false);
        handleOnAlertAssigneesSubmit();
      }
    }, [handleOnAlertAssigneesSubmit, isPopoverOpen, needToUpdateAssignees, selectedAssignees]);

    return (
      <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs" data-test-subj={ASSIGNEES_TITLE_TEST_ID}>
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.header.assignedTitle"
                defaultMessage="Assigned:"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span data-test-subj={ASSIGNEES_VALUE_TEST_ID}>
            {assignees.length > 2 ? (
              <EuiToolTip
                position="top"
                content={assignees.map((user) => (
                  <div>{user.user.email ?? user.user.username}</div>
                ))}
                repositionOnScroll={true}
              >
                <EuiNotificationBadge data-test-subj={ASSIGNEES_COUNT_BADGE_TEST_ID}>
                  {assignees.length}
                </EuiNotificationBadge>
              </EuiToolTip>
            ) : (
              assignees.map((user) => (
                <UserAvatar
                  key={user.uid}
                  data-test-subj={ASSIGNEE_AVATAR_TEST_ID(user.user.username)}
                  user={user.user}
                  avatar={user.data.avatar}
                  size={'s'}
                />
              ))
            )}
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AssigneesPopover
            existingAssigneesIds={alertAssignees}
            isPopoverOpen={isPopoverOpen}
            onUsersChange={onUsersChange}
            onClosePopover={onClosePopover}
            togglePopover={togglePopover}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

Assignees.displayName = 'Assignees';
