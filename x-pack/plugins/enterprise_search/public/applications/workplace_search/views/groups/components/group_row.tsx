/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import moment from 'moment';

import { EuiTableRow, EuiTableRowCell, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MANAGE_BUTTON_LABEL } from '../../../../shared/constants';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { TruncatedContent } from '../../../../shared/truncate';
import { getGroupPath } from '../../../routes';
import { Group } from '../../../types';
import { MAX_NAME_LENGTH } from '../group_logic';

import { GroupSources } from './group_sources';

const DAYS_CUTOFF = 8;
export const NO_SOURCES_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.noSourcesMessage',
  {
    defaultMessage: 'No organizational content sources',
  }
);

const dateDisplay = (date: string) =>
  moment(date).isAfter(moment().subtract(DAYS_CUTOFF, 'days'))
    ? moment(date).fromNow()
    : moment(date).format('MMMM D, YYYY');

export const GroupRow: React.FC<Group> = ({ id, name, updatedAt, contentSources }) => {
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
      <EuiTableRowCell align="right">
        <strong>
          <EuiLinkTo aria-label={MANAGE_BUTTON_LABEL} to={getGroupPath(id)}>
            <EuiIcon type="pencil" />
          </EuiLinkTo>
        </strong>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
