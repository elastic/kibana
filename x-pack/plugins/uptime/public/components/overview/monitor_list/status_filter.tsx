/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilterGroup } from '@elastic/eui';
import { FilterStatusButton } from './filter_status_button';
import { useGetUrlParams } from '../../../hooks';
import {
  LAST_DOWN_LABEL,
  LAST_UP_LABEL,
  STATUS_DOWN_LABEL,
  STATUS_UP_LABEL,
} from '../../common/translations';

export const StatusFilter = ({
  showLastStatusFilter = true,
}: {
  showLastStatusFilter?: boolean;
}) => {
  const { statusFilter } = useGetUrlParams();

  // Empty string for all filter button value, since we dont store it in url, so keeping it in sync
  const ALL = '';

  return (
    <EuiFilterGroup>
      <FilterStatusButton
        content={i18n.translate('xpack.uptime.filterBar.filterAllLabel', {
          defaultMessage: 'All',
        })}
        dataTestSubj="xpack.uptime.filterBar.filterStatusAll"
        value={ALL}
        withNext={false}
        isActive={statusFilter === ''}
      />
      <FilterStatusButton
        content={STATUS_UP_LABEL}
        dataTestSubj="xpack.uptime.filterBar.filterStatusUp"
        value="up"
        withNext={true}
        isActive={statusFilter === 'up'}
      />
      {showLastStatusFilter && (
        <FilterStatusButton
          content={LAST_UP_LABEL}
          dataTestSubj="uptimeLastUpFilter"
          value="lastUp"
          withNext={false}
          isActive={statusFilter === 'lastUp'}
        />
      )}
      <FilterStatusButton
        content={STATUS_DOWN_LABEL}
        dataTestSubj="xpack.uptime.filterBar.filterStatusDown"
        value="down"
        withNext={true}
        isActive={statusFilter === 'down'}
      />
      {showLastStatusFilter && (
        <FilterStatusButton
          content={LAST_DOWN_LABEL}
          dataTestSubj="uptimeLastDownFilter"
          value="lastDown"
          withNext={false}
          isActive={statusFilter === 'lastDown'}
        />
      )}
    </EuiFilterGroup>
  );
};
