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
import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../../common/translations';

export const StatusFilter: React.FC = () => {
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
        withNext={true}
        isActive={statusFilter === ''}
      />
      <FilterStatusButton
        content={STATUS_UP_LABEL}
        dataTestSubj="xpack.uptime.filterBar.filterStatusUp"
        value="up"
        withNext={true}
        isActive={statusFilter === 'up'}
      />
      <FilterStatusButton
        content={STATUS_DOWN_LABEL}
        dataTestSubj="xpack.uptime.filterBar.filterStatusDown"
        value="down"
        withNext={false}
        isActive={statusFilter === 'down'}
      />
    </EuiFilterGroup>
  );
};
