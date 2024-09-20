/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { max, min } from 'lodash';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimesliceAnnotation } from './timeslice_annotation';
import { EventsAreaChart } from './events_area_chart';
import { TimeBounds } from '../types';
import { SloTabId } from './slo_details';
import { useGetPreviewData } from '../../../hooks/use_get_preview_data';
import { useKibana } from '../../../utils/kibana_react';
import { GoodBadEventsChart } from '../../../components/good_bad_events_chart/good_bad_events_chart';
import { getDiscoverLink } from '../../../utils/slo/get_discover_link';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: { from: Date; to: Date };
  selectedTabId: SloTabId;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function EventsChartPanel({ slo, range, selectedTabId, onBrushed }: Props) {
  const { discover, uiSettings } = useKibana().services;

  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    groupBy: slo.groupBy,
    indicator: slo.indicator,
    groupings: slo.groupings,
    instanceId: slo.instanceId,
    remoteName: slo.remote?.remoteName,
  });

  const title =
    slo.indicator.type !== 'sli.metric.timeslice' ? (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.title', {
            defaultMessage: 'Good vs bad events',
          })}
        </h2>
      </EuiTitle>
    ) : (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.timesliceTitle', {
            defaultMessage: 'Timeslice metric',
          })}
        </h2>
      </EuiTitle>
    );

  const values = (data || []).map((row) => {
    if (slo.indicator.type === 'sli.metric.timeslice') {
      return row.sliValue;
    } else {
      return row?.events?.total || 0;
    }
  });
  const maxValue = max(values);
  const minValue = min(values);

  const annotation = <TimesliceAnnotation slo={slo} minValue={minValue} maxValue={maxValue} />;

  const showViewEventsLink = ![
    'sli.apm.transactionErrorRate',
    'sli.apm.transactionDuration',
  ].includes(slo.indicator.type);

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="eventsChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={1}> {title}</EuiFlexItem>
            {selectedTabId !== 'history' && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.duration', {
                    defaultMessage: 'Last 24h',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {showViewEventsLink && (
            <EuiFlexItem grow={0}>
              <EuiLink
                color="text"
                href={getDiscoverLink({
                  slo,
                  timeRange: {
                    from: 'now-24h',
                    to: 'now',
                    mode: 'relative',
                  },
                  discover,
                  uiSettings,
                })}
                data-test-subj="sloDetailDiscoverLink"
              >
                <EuiIcon type="sortRight" style={{ marginRight: '4px' }} />
                <FormattedMessage
                  id="xpack.slo.sloDetails.viewEventsLink"
                  defaultMessage="View events"
                />
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiFlexItem>
          {slo.indicator.type !== 'sli.metric.timeslice' ? (
            <GoodBadEventsChart
              isLoading={isLoading}
              data={data || []}
              annotation={annotation}
              slo={slo}
              onBrushed={onBrushed}
            />
          ) : (
            <>
              {isLoading && (
                <EuiLoadingChart size="m" mono data-test-subj="sliEventsChartLoading" />
              )}

              {!isLoading && (
                <EventsAreaChart
                  slo={slo}
                  annotation={annotation}
                  minValue={minValue}
                  maxValue={maxValue}
                  onBrushed={onBrushed}
                />
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
