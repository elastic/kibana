/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiTitle, EuiPanel } from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { ALERT_START, ALERT_END } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { TopAlert } from '../../..';
import { Groups } from '../../../components/alert_sources/groups';
import { getSources } from '../../../components/alert_sources/get_sources';

export interface SourceBarProps {
  alert: TopAlert;
}

export function SourceBar({ alert }: SourceBarProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];

  const alertSummary = [];
  const groups = getSources(alert) as Array<{ field: string; value: string }>;

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  if (groups && groups.length > 0) {
    alertSummary.push({
      label: i18n.translate('xpack.observability.alertDetails.sourceBar.source', {
        defaultMessage: 'Source',
      }),
      value: (
        <Groups groups={groups} timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }} />
      ),
    });
  }

  return (
    <>
      {groups && groups.length > 0 && (
        <EuiPanel data-test-subj="alert-summary-container" hasShadow={false} hasBorder={true}>
          <EuiFlexGroup gutterSize="l" direction="row" wrap>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.observability.alertDetails.sourceBar.source"
                  defaultMessage="Source"
                />
              </h5>
            </EuiTitle>
            <Groups
              groups={groups}
              timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }}
            />
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default SourceBar;
