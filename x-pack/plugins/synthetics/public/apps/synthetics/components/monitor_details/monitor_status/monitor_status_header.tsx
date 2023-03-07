/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { ConfigKey } from '../../../../../../common/runtime_types';
import { MONITOR_HISTORY_ROUTE } from '../../../../../../common/constants';
import { stringifyUrlParams } from '../../../utils/url_params';
import { useGetUrlParams } from '../../../hooks';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';

import * as labels from './labels';
import { MonitorStatusPanelProps } from './monitor_status_data';

export const MonitorStatusHeader = ({
  from,
  to,
  periodCaption,
  showViewHistoryButton,
}: MonitorStatusPanelProps) => {
  const history = useHistory();
  const params = useGetUrlParams();
  const { monitor } = useSelectedMonitor();

  const isLast24Hours = from === 'now-24h' && to === 'now';
  const periodCaptionText = !!periodCaption
    ? periodCaption
    : isLast24Hours
    ? labels.LAST_24_HOURS_LABEL
    : '';

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="baseline"
      css={{
        marginBottom: 0,
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>{labels.STATUS_LABEL}</h4>
        </EuiTitle>
      </EuiFlexItem>
      {periodCaptionText ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {periodCaptionText}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={true} />

      {showViewHistoryButton ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={
              monitor?.[ConfigKey.CONFIG_ID]
                ? history.createHref({
                    pathname: MONITOR_HISTORY_ROUTE.replace(
                      ':monitorId',
                      monitor[ConfigKey.CONFIG_ID]
                    ),
                    search: stringifyUrlParams(
                      { ...params, dateRangeStart: 'now-24h', dateRangeEnd: 'now' },
                      true
                    ),
                  })
                : undefined
            }
            data-test-subj="monitorStatusChartViewHistoryButton"
            size="xs"
            iconType="list"
          >
            {labels.VIEW_HISTORY_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
