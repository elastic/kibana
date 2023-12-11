/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilterGroup } from '@elastic/eui';
import { FilterStatusButton } from '../../common/components/filter_status_button';
import {
  STATUS_DOWN_LABEL,
  STATUS_UP_LABEL,
} from '../../../../../../common/translations/translations';

export const StatusFilter: React.FC = () => {
  return (
    <EuiFilterGroup compressed>
      <FilterStatusButton
        content={i18n.translate('xpack.synthetics.filterBar.filterAllLabel', {
          defaultMessage: 'All',
        })}
        dataTestSubj="xpack.synthetics.filterBar.filterStatusAll"
        value={undefined}
        withNext={true}
      />
      <FilterStatusButton
        content={STATUS_UP_LABEL}
        dataTestSubj="xpack.synthetics.filterBar.filterStatusUp"
        value="up"
        withNext={true}
      />
      <FilterStatusButton
        content={STATUS_DOWN_LABEL}
        dataTestSubj="xpack.synthetics.filterBar.filterStatusDown"
        value="down"
        withNext={false}
      />
    </EuiFilterGroup>
  );
};
