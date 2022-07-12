/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { createExploratoryViewUrl } from '@kbn/observability-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageLoadDistChart } from '../charts/page_load_dist_chart';
import { ResetPercentileZoom } from './reset_percentile_zoom';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { PercentileRange } from './types';

export function PageLoadDistribution() {
  const { http } = useKibanaServices();

  const { urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end, rangeFrom, rangeTo } = urlParams;

  const { serviceName } = uxUiFilters;

  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

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
    http.basePath.get()
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
                id="xpack.ux.pageViews.analyze"
                defaultMessage="Analyze"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <PageLoadDistChart
        onPercentileChange={onPercentileChange}
        breakdown={breakdown}
        start={start ?? ''}
        end={end ?? ''}
        uiFilters={uxUiFilters}
      />
    </div>
  );
}
