/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { callDateMath } from '../../../../services/data/call_date_math';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  createExploratoryViewUrl,
  useEsSearch,
} from '@kbn/observability-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../breakdowns/breakdown_filter';
import { PageLoadDistChart } from '../charts/page_load_dist_chart';
import { ResetPercentileZoom } from './reset_percentile_zoom';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import {
  getPageLoadDistribution,
  getPercentilesDistribution,
} from '@kbn/ux-plugin/public/services/data/page_load_distribution';
import { useDataView } from '../local_uifilters/use_data_view';

export interface PercentileRange {
  min?: number | null;
  max?: number | null;
}

export const MICRO_TO_SEC = 1000000;

export function microToSec(val: number) {
  return Math.round((val / MICRO_TO_SEC + Number.EPSILON) * 100) / 100;
}

export const getPLDChartSteps = ({
  maxDuration,
  minDuration,
  initStepValue,
}: {
  maxDuration: number;
  minDuration: number;
  initStepValue?: number;
}) => {
  let stepValue = 0.5;
  // if diff is too low, let's lower
  // down the steps value to increase steps
  if (maxDuration - minDuration <= 5 * MICRO_TO_SEC) {
    stepValue = 0.1;
  }

  if (initStepValue) {
    stepValue = initStepValue;
  }

  let initValue = minDuration;
  const stepValues = [initValue];

  while (initValue < maxDuration) {
    initValue += stepValue * MICRO_TO_SEC;
    stepValues.push(initValue);
  }

  return stepValues;
};
function removeZeroesFromTail(distData: Array<{ x: number; y: number }>) {
  if (distData.length > 0) {
    while (distData[distData.length - 1].y === 0) {
      distData.pop();
    }
  }
  return distData;
}

export function PageLoadDistribution() {
  const { http } = useKibanaServices();

  const { rangeId, urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end, rangeFrom, rangeTo, searchTerm } = urlParams;

  const { serviceName } = uxUiFilters;

  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const { dataViewTitle } = useDataView();

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { params, maxDuration, minDuration } = useMemo(() => {
    return getPageLoadDistribution({
      start: callDateMath(start),
      end: callDateMath(end),
      setup: { uiFilters: uxUiFilters },
      urlQuery: searchTerm,
      ...(percentileRange.min && percentileRange.max
        ? {
            minPercentile: String(percentileRange.min),
            maxPercentile: String(percentileRange.max),
          }
        : {}),
    });
  }, [
    start,
    end,
    uxUiFilters,
    searchTerm,
    percentileRange.min,
    percentileRange.max,
  ]);

  const { data: d, loading: l } = useEsSearch(
    {
      index: dataViewTitle,
      ...params,
    },
    [dataViewTitle, params],
    { name: 'UxPageLoadDistribution' }
  );

  const dd = useMemo(() => {
    if (l || !d) return null;

    const {
      aggregations,
      hits: { total },
    } = d;

    if (total.value === 0) {
      return null;
    }

    const { durPercentiles, loadDistribution } = aggregations ?? {};

    let pageDistVals = loadDistribution?.values ?? [];

    const maxPercQuery = durPercentiles?.values['99.0'] ?? 0;

    let durationMax = maxDuration;
    // we assumed that page load will never exceed 50secs, if 99th percentile is
    // greater then let's fetch additional 10 steps, to cover that on the chart
    if (maxPercQuery > maxDuration && !percentileRange.max) {
      const additionalStepsPageVals = getPercentilesDistribution({
        setup: { uiFilters: uxUiFilters },
        maxDuration: maxPercQuery,
        // we pass 50sec as min to get next steps
        minDuration: maxDuration,
        start: callDateMath(start),
        end: callDateMath(end),
      });

      pageDistVals = (pageDistVals ?? []).concat(additionalStepsPageVals);
      durationMax = maxPercQuery;
    }

    // calculate the diff to get actual page load on specific duration value
    let pageDist = (pageDistVals ?? []).map(
      ({ key, value: maybeNullValue }, index: number, arr) => {
        // FIXME: values from percentile* aggs can be null
        const value = maybeNullValue!;
        return {
          x: microToSec(key),
          y: index === 0 ? value : value - arr[index - 1].value!,
        };
      }
    );

    pageDist = removeZeroesFromTail(pageDist);

    Object.entries(durPercentiles?.values ?? {}).forEach(([key, val]) => {
      if (durPercentiles?.values?.[key]) {
        durPercentiles.values[key] = microToSec(val as number);
      }
    });

    return {
      pageLoadDistribution: {
        pageLoadDistribution: pageDist,
        percentiles: durPercentiles?.values,
        minDuration: microToSec(minDuration),
        maxDuration: microToSec(durationMax),
      },
    };
  }, [percentileRange.max, minDuration, maxDuration, d, l]);

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
      <EuiSpacer size="m" />
      <PageLoadDistChart
        data={dd?.pageLoadDistribution}
        onPercentileChange={onPercentileChange}
        loading={l ?? true}
        breakdown={breakdown}
        percentileRange={{
          max: percentileRange.max || dd?.pageLoadDistribution?.maxDuration,
          min: percentileRange.min || dd?.pageLoadDistribution?.minDuration,
        }}
      />
    </div>
  );
}
