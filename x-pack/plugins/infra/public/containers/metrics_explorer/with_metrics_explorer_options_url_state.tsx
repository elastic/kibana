/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { set, values } from 'lodash';
import React, { useContext, useMemo } from 'react';
import { MetricsExplorerColor } from '../../../common/color_palette';
import { MetricsExplorerAggregation } from '../../../server/routes/metrics_explorer/types';
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
  const schema = Joi.object({
    limit: Joi.number()
      .min(1)
      .default(9),
    groupBy: Joi.string(),
    filterQuery: Joi.string().allow(''),
    aggregation: Joi.string().required(),
    metrics: Joi.array()
      .items(
        Joi.object().keys({
          aggregation: Joi.string()
            .valid(values(MetricsExplorerAggregation))
            .required(),
          field: Joi.string(),
          rate: Joi.bool().default(false),
          color: Joi.string().valid(values(MetricsExplorerColor)),
          label: Joi.string(),
        })
      )
      .required(),
  });
  const validation = Joi.validate(subject, schema);
  return validation.error == null;
}

function isMetricExplorerTimeOption(subject: any): subject is MetricsExplorerTimeOptions {
  const schema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    interval: Joi.string().required(),
  });
  const validation = Joi.validate(subject, schema);
  return validation.error == null;
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
