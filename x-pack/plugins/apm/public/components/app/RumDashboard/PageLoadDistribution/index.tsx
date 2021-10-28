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
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageLoadDistChart } from '../Charts/PageLoadDistChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { ResetPercentileZoom } from './ResetPercentileZoom';
import { createExploratoryViewUrl } from '../../../../../../observability/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export interface PercentileRange {
  min?: number | null;
  max?: number | null;
}

export function PageLoadDistribution() {
  const {
    services: { http },
  } = useKibana();

  const { urlParams, uxUiFilters } = useUrlParams();

  const { start, end, rangeFrom, rangeTo, searchTerm } = urlParams;

  const { serviceName } = uxUiFilters;

  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/page-load-distribution',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uxUiFilters),
              urlQuery: searchTerm,
              ...(percentileRange.min && percentileRange.max
                ? {
                    minPercentile: String(percentileRange.min),
                    maxPercentile: String(percentileRange.max),
                  }
                : {}),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [
      end,
      start,
      uxUiFilters,
      percentileRange.min,
      percentileRange.max,
      searchTerm,
      serviceName,
    ]
  );

  const onPercentileChange = (min: number, max: number) => {
    setPercentileRange({ min, max });
  };

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
    http?.basePath.get()
  );

  const showAnalyzeButton = false;

  return (
    <div data-cy="pageLoadDist">
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageLoadDistribution}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <ResetPercentileZoom
          percentileRange={percentileRange}
          setPercentileRange={setPercentileRange}
        />
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pldBreakdownFilter'}
          />
        </EuiFlexItem>
        {showAnalyzeButton && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              isDisabled={!serviceName?.[0]}
              href={exploratoryViewLink}
            >
              <FormattedMessage
                id="xpack.apm.csm.pageViews.analyze"
                defaultMessage="Analyze"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <PageLoadDistChart
        data={data?.pageLoadDistribution}
        onPercentileChange={onPercentileChange}
        loading={status !== 'success'}
        breakdown={breakdown}
        percentileRange={{
          max: percentileRange.max || data?.pageLoadDistribution?.maxDuration,
          min: percentileRange.min || data?.pageLoadDistribution?.minDuration,
        }}
      />
    </div>
  );
}
