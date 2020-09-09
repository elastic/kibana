/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { useValues } from 'kea';

import { EuiTableRow, EuiTableRowCell } from '@elastic/eui';

import { TruncatedContent } from '../../../../shared/truncate';

import { IGroup } from '../../../types';

import { AppLogic } from '../../../app_logic';
import { getGroupPath } from '../../../routes';
import { MAX_NAME_LENGTH } from '../group_logic';
import { GroupSources } from './group_sources';
import { GroupUsers } from './group_users';

const DAYS_CUTOFF = 8;

const dateDisplay = (date: string) =>
  moment(date).isAfter(moment().subtract(DAYS_CUTOFF, 'days'))
    ? moment(date).fromNow()
    : moment(date).format('MMMM D, YYYY');

export const GroupRow: React.FC<IGroup> = ({
  id,
  name,
  updatedAt,
  contentSources,
  users,
  usersCount,
}) => {
  const { isFederatedAuth } = useValues(AppLogic);

  return (
    <EuiTableRow data-test-subj="GroupsRow">
      <EuiTableRowCell>
        <strong>
          <Link to={getGroupPath(id)}>
            <TruncatedContent tooltipType="title" content={name} length={MAX_NAME_LENGTH} />
          </Link>
        </strong>
        <br />
        <small>Last updated {dateDisplay(updatedAt)}</small>
      </EuiTableRowCell>
      <EuiTableRowCell>
        <div className="user-group__sources">
          {contentSources.length > 0 ? (
            <GroupSources groupSources={contentSources} />
          ) : (
            'No shared content sources'
          )}
        </div>
      </EuiTableRowCell>
      {!isFederatedAuth && (
        <EuiTableRowCell>
          <div className="user-group__accounts">
            {usersCount > 0 ? (
              <GroupUsers groupUsers={users} usersCount={usersCount} groupId={id} />
            ) : (
              'No users'
            )}
          </div>
        </EuiTableRowCell>
      )}
      <EuiTableRowCell>
        <strong>
          <Link to={getGroupPath(id)}>Manage</Link>
        </strong>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
