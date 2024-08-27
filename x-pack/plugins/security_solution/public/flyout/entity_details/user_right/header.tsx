/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiBadge, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { max } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { FlyoutHeader, FlyoutTitle } from '@kbn/security-solution-common';
import type { UserItem } from '../../../../common/search_strategy';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { getUsersDetailsUrl } from '../../../common/components/link_to/redirect_to_users';
import type { ManagedUserData } from './types';

import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';

interface UserPanelHeaderProps {
  userName: string;
  observedUser: ObservedEntityData<UserItem>;
  managedUser: ManagedUserData;
}

const linkTitleCSS = { width: 'fit-content' };

export const UserPanelHeader = ({ userName, observedUser, managedUser }: UserPanelHeaderProps) => {
  const oktaTimestamp = managedUser.data?.[ManagedUserDatasetKey.OKTA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;
  const entraTimestamp = managedUser.data?.[ManagedUserDatasetKey.ENTRA]?.fields?.[
    '@timestamp'
  ][0] as string | undefined;

  const isManaged = !!oktaTimestamp || !!entraTimestamp;
  const lastSeenDate = useMemo(
    () =>
      max(
        [observedUser.lastSeen.date, entraTimestamp, oktaTimestamp].map((el) => el && new Date(el))
      ),
    [oktaTimestamp, entraTimestamp, observedUser.lastSeen]
  );

  return (
    <FlyoutHeader data-test-subj="user-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj={'user-panel-header-lastSeen'}>
            {lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />}
            <EuiSpacer size="xs" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.users}
            path={getUsersDetailsUrl(userName)}
            target={'_blank'}
            external={false}
            css={linkTitleCSS}
          >
            <FlyoutTitle title={userName} iconType={'user'} isLink />
          </SecuritySolutionLinkAnchor>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {observedUser.lastSeen.date && (
                <EuiBadge data-test-subj="user-panel-header-observed-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.user.observedBadge"
                    defaultMessage="Observed"
                  />
                </EuiBadge>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isManaged && (
                <EuiBadge data-test-subj="user-panel-header-managed-badge" color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.user.managedBadge"
                    defaultMessage="Managed"
                  />
                </EuiBadge>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
