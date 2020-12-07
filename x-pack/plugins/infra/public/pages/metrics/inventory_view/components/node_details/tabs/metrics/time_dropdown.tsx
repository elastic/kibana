/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  value: number;
  onChange(event: React.ChangeEvent<HTMLSelectElement>): void;
}

export const TimeDropdown = (props: Props) => (
  <EuiSelect
    fullWidth={true}
    options={[
      {
        text: i18n.translate('xpack.infra.nodeDetails.metrics.last15Minutes', {
          defaultMessage: 'Last 15 mintues',
        }),
        value: 15 * 60 * 1000,
      },
      {
        text: i18n.translate('xpack.infra.nodeDetails.metrics.lastHour', {
          defaultMessage: 'Last hour',
        }),
        value: 60 * 60 * 1000,
      },
      {
        text: i18n.translate('xpack.infra.nodeDetails.metrics.last3Hours', {
          defaultMessage: 'Last 3 hours',
        }),
        value: 3 * 60 * 60 * 1000,
      },
      {
        text: i18n.translate('xpack.infra.nodeDetails.metrics.last24Hours', {
          defaultMessage: 'Last 24 hours',
        }),
        value: 24 * 60 * 60 * 1000,
      },
      {
        text: i18n.translate('xpack.infra.nodeDetails.metrics.last7Days', {
          defaultMessage: 'Last 7 days',
        }),
        value: 7 * 24 * 60 * 60 * 1000,
      },
    ]}
    value={props.value}
    onChange={props.onChange}
  />
);
