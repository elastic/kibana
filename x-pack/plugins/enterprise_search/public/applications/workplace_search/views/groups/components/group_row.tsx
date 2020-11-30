/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EuiTableRow, EuiTableRowCell, EuiIcon } from '@elastic/eui';

import { TruncatedContent } from '../../../../shared/truncate';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { Group } from '../../../types';

import { AppLogic } from '../../../app_logic';
import { getGroupPath } from '../../../routes';
import { MAX_NAME_LENGTH } from '../group_logic';
import { GroupSources } from './group_sources';
import { GroupUsers } from './group_users';

const DAYS_CUTOFF = 8;
export const NO_SOURCES_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.noSourcesMessage',
  {
    defaultMessage: 'No shared content sources',
  }
);
export const NO_USERS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.noUsersMessage',
  {
    defaultMessage: 'No users',
  }
);

const dateDisplay = (date: string) =>
  moment(date).isAfter(moment().subtract(DAYS_CUTOFF, 'days'))
    ? moment(date).fromNow()
    : moment(date).format('MMMM D, YYYY');

export const GroupRow: React.FC<Group> = ({
  id,
  name,
  updatedAt,
  contentSources,
  users,
  usersCount,
}) => {
  const { isFederatedAuth } = useValues(AppLogic);

  const GROUP_UPDATED_TEXT = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.groupUpdatedText',
    {
      defaultMessage: 'Last updated {updatedAt}.',
      values: { updatedAt: dateDisplay(updatedAt) },
    }
  );

  return (
    <EuiTableRow data-test-subj="GroupsRow">
      <EuiTableRowCell>
        <strong>
          <EuiLinkTo to={getGroupPath(id)}>
            <TruncatedContent tooltipType="title" content={name} length={MAX_NAME_LENGTH} />
          </EuiLinkTo>
        </strong>
        <br />
        <small>{GROUP_UPDATED_TEXT}</small>
      </EuiTableRowCell>
      <EuiTableRowCell>
        <div className="user-group__sources">
          {contentSources.length > 0 ? (
            <GroupSources groupSources={contentSources} />
          ) : (
            NO_SOURCES_MESSAGE
          )}
        </div>
      </EuiTableRowCell>
      {!isFederatedAuth && (
        <EuiTableRowCell>
          <div className="user-group__accounts">
            {usersCount > 0 ? (
              <GroupUsers groupUsers={users} usersCount={usersCount} groupId={id} />
            ) : (
              NO_USERS_MESSAGE
            )}
          </div>
        </EuiTableRowCell>
      )}
      <EuiTableRowCell>
        <strong>
          <EuiLinkTo to={getGroupPath(id)}>
            <EuiIcon type="pencil" />
          </EuiLinkTo>
        </strong>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
