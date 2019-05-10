/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set, values } from 'lodash';
import React, { useContext, useMemo } from 'react';
import * as t from 'io-ts';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { MetricsExplorerColor } from '../../../common/color_palette';
import { UrlStateContainer } from '../../utils/url_state';
import {
  MetricsExplorerOptions,
  MetricsExplorerOptionsContainer,
  MetricsExplorerTimeOptions,
} from './use_metrics_explorer_options';

interface MetricsExplorerUrlState {
  timerange?: MetricsExplorerTimeOptions;
  options?: MetricsExplorerOptions;
}

export const WithMetricsExplorerOptionsUrlState = () => {
  const { options, currentTimerange, setOptions: setRawOptions, setTimeRange } = useContext(
    MetricsExplorerOptionsContainer.Context
  );

  const setOptions = (value: MetricsExplorerOptions) => {
    setRawOptions(value);
  };

  const urlState = useMemo(
    () => ({
      options,
      timerange: currentTimerange,
    }),
    [options, currentTimerange]
  );

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="metricsExplorer"
      mapToUrlState={mapToUrlState}
      onChange={newUrlState => {
        if (newUrlState && newUrlState.options) {
          setOptions(newUrlState.options);
        }
        if (newUrlState && newUrlState.timerange) {
          setTimeRange(newUrlState.timerange);
        }
      }}
      onInitialize={newUrlState => {
        if (newUrlState && newUrlState.options) {
          setOptions(newUrlState.options);
        }
        if (newUrlState && newUrlState.timerange) {
          setTimeRange(newUrlState.timerange);
        }
      }}
    />
  );
};

function isMetricExplorerOptions(subject: any): subject is MetricsExplorerOptions {
  const MetricRequired = t.type({
    aggregation: t.string,
  });

  const MetricOptional = t.partial({
    field: t.string,
    rate: t.boolean,
    color: t.union(values(MetricsExplorerColor).map(c => t.literal(c as string))),
    label: t.string,
  });

  const Metric = t.intersection([MetricRequired, MetricOptional]);

  const OptionsRequired = t.type({
    aggregation: t.string,
    metrics: t.array(Metric),
  });

  const OptionsOptional = t.partial({
    limit: t.number,
    groupBy: t.string,
    filterQuery: t.string,
  });

  const Options = t.intersection([OptionsRequired, OptionsOptional]);

  const result = Options.decode(subject);

  try {
    ThrowReporter.report(result);
    return true;
  } catch (e) {
    return false;
  }
}

function isMetricExplorerTimeOption(subject: any): subject is MetricsExplorerTimeOptions {
  const TimeRange = t.type({
    from: t.string,
    to: t.string,
    interval: t.string,
  });
  const result = TimeRange.decode(subject);
  try {
    ThrowReporter.report(result);
    return true;
  } catch (e) {
    return false;
  }
}

const mapToUrlState = (value: any): MetricsExplorerUrlState | undefined => {
  const finalState = {};
  if (value) {
    if (value.options && isMetricExplorerOptions(value.options)) {
      set(finalState, 'options', value.options);
    }
    if (value.timerange && isMetricExplorerTimeOption(value.timerange)) {
      set(finalState, 'timerange', value.timerange);
    }
    return finalState;
  }
};
