/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { createExploratoryViewUrl } from '@kbn/observability-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageViewsChart } from '../charts/page_views_chart';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { BreakdownItem } from '../../../../../typings/ui_filters';

export function PageViewsTrend() {
  const { http } = useKibanaServices();

  const { rangeId, urlParams, uxUiFilters } = useLegacyUrlParams();
  const { serviceName } = uxUiFilters;

  const { start, end, searchTerm, rangeTo, rangeFrom } = urlParams;

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi('GET /internal/apm/ux/page-view-trends', {
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uxUiFilters),
              urlQuery: searchTerm,
              ...(breakdown
                ? {
                    breakdowns: JSON.stringify(breakdown),
                  }
                : {}),
            },
          },
        });
      }
      return Promise.resolve(undefined);
    },
    // `rangeId` acts as a cache buster for stable ranges like "Today"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, serviceName, uxUiFilters, searchTerm, breakdown, rangeId]
  );

  const exploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          name: `${serviceName}-page-views`,
          dataType: 'ux',
          time: { from: rangeFrom!, to: rangeTo! },
          reportDefinitions: {
            'service.name': serviceName as string[],
          },
          ...(breakdown ? { breakdown: breakdown.fieldName } : {}),
        },
      ],
    },
    http.basePath.get()
  );

  const showAnalyzeButton = false;

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageViews}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pvBreakdownFilter'}
          />
        </EuiFlexItem>
        {showAnalyzeButton && (
          <EuiFlexItem grow={false} style={{ width: 170 }}>
            <EuiButton
              size="s"
              isDisabled={!serviceName?.[0]}
              href={exploratoryViewLink}
            >
              <FormattedMessage
                id="xpack.ux.pageViews.analyze"
                defaultMessage="Analyze"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageViewsChart data={data} loading={status !== 'success'} />
    </div>
  );
}
