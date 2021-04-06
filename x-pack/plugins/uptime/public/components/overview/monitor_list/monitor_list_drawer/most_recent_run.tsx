/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { MonitorSummary } from '../../../../../common/runtime_types';

interface Props {
  summary: MonitorSummary;
}

export const MostRecentRun = ({ summary }: Props) => {
  return (
    <EuiDescriptionList>
      <EuiDescriptionListTitle>
        {i18n.translate('xpack.uptime.monitorList.drawer.mostRecentRun', {
          defaultMessage: 'Most recent test run',
        })}
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText size="s">{moment(summary.state.timestamp).format('LLL').toString()}</EuiText>
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
