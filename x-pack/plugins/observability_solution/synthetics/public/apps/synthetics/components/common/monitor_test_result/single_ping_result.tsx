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
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Ping } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';

export const SinglePingResult = ({ ping }: { ping?: Ping }) => {
  const ip = ping?.resolve?.ip;
  const durationUs = ping?.monitor?.duration?.us ?? NaN;
  const rtt = ping?.resolve?.rtt?.us ?? NaN;
  const url = ping?.url?.full;
  const responseStatus = ping?.http?.response?.status_code;

  return (
    <>
      <EuiDescriptionList type="column" compressed={true}>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.synthetics.singlePingResult.ipDescriptionListTitleLabel', {
            defaultMessage: 'IP',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{ip}</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{DURATION_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {isNaN(durationUs) ? '' : formatTestDuration(durationUs)}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.synthetics.singlePingResult.rttDescriptionListTitleLabel', {
            defaultMessage: 'rtt',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {isNaN(rtt) ? '' : formatTestDuration(rtt)}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.synthetics.singlePingResult.urlDescriptionListTitleLabel', {
            defaultMessage: 'URL',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription className="eui-textBreakWord">
          <EuiLink data-test-subj="syntheticsSinglePingResultLink" href={url}>
            {url}
          </EuiLink>
        </EuiDescriptionListDescription>

        {responseStatus ? (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate(
                'xpack.synthetics.singlePingResult.responseStatusDescriptionListTitleLabel',
                { defaultMessage: 'Response status' }
              )}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiBadge>{responseStatus}</EuiBadge>
            </EuiDescriptionListDescription>
          </>
        ) : null}
      </EuiDescriptionList>
    </>
  );
};

const DURATION_LABEL = i18n.translate('xpack.synthetics.monitor.duration.label', {
  defaultMessage: 'Duration',
});
