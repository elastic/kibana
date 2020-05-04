/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilterGroup, EuiTextColor } from '@elastic/eui';
import { FilterStatusButton } from './filter_status_button';
import { useGetUrlParams } from '../../../hooks';

export const StatusFilter: React.FC = () => {
  const { statusFilter } = useGetUrlParams();

  return (
    <EuiFilterGroup>
      <FilterStatusButton
        content={i18n.translate('xpack.uptime.filterBar.filterAllLabel', {
          defaultMessage: 'All',
        })}
        dataTestSubj="xpack.uptime.filterBar.filterStatusAll"
        value="all"
        withNext={true}
      />
      <FilterStatusButton
        content={
          <EuiTextColor color={statusFilter === 'up' ? 'secondary' : undefined}>
            {i18n.translate('xpack.uptime.filterBar.filterUpLabel', {
              defaultMessage: 'Up',
            })}
          </EuiTextColor>
        }
        dataTestSubj="xpack.uptime.filterBar.filterStatusUp"
        value="up"
        withNext={true}
      />
      <FilterStatusButton
        content={i18n.translate('xpack.uptime.filterBar.filterDownLabel', {
          defaultMessage: 'Down',
        })}
        dataTestSubj="xpack.uptime.filterBar.filterStatusDown"
        value="down"
        withNext={false}
        color={'danger'}
      />
    </EuiFilterGroup>
  );
};
