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
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Ping } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';

export const SinglePingResult = ({ ping, loading }: { ping?: Ping; loading: boolean }) => {
  const ip = !loading ? ping?.resolve?.ip : undefined;
  const durationUs = !loading ? ping?.monitor?.duration?.us ?? NaN : NaN;
  const rtt = !loading ? ping?.resolve?.rtt?.us ?? NaN : NaN;
  const url = !loading ? ping?.url?.full : undefined;
  const responseStatus = !loading ? ping?.http?.response?.status_code : undefined;

  return (
    <EuiDescriptionList type="column" compressed={true}>
      <EuiDescriptionListTitle>IP</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>{ip}</EuiDescriptionListDescription>
      <EuiDescriptionListTitle>{DURATION_LABEL}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {isNaN(durationUs) ? '' : formatTestDuration(durationUs)}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>rtt</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {isNaN(rtt) ? '' : formatTestDuration(rtt)}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>URL</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>{url}</EuiDescriptionListDescription>

      {responseStatus ? (
        <>
          <EuiDescriptionListTitle>Response status</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiBadge>{responseStatus}</EuiBadge>
          </EuiDescriptionListDescription>
        </>
      ) : null}
    </EuiDescriptionList>
  );
};

const DURATION_LABEL = i18n.translate('xpack.synthetics.monitor.duration.label', {
  defaultMessage: 'Duration',
});
