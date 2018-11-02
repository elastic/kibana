/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { InfraNodeType } from 'x-pack/plugins/infra/common/graphql/types';
import { replaceMetricTimeInQueryString } from '../../containers/metrics/with_metrics_time';
import { getFromFromLocation, getToFromLocation } from './query_params';

type RedirectToNodeDetailProps = RouteComponentProps<{
  nodeName: string;
  nodeType: InfraNodeType;
}>;

export const RedirectToNodeDetail = ({
  match: {
    params: { nodeName, nodeType },
  },
  location,
}: RedirectToNodeDetailProps) => {
  const searchString = replaceMetricTimeInQueryString(
    getFromFromLocation(location),
    getToFromLocation(location)
  )('');

  return <Redirect to={`/metrics/${nodeType}/${nodeName}?${searchString}`} />;
};

export const getNodeDetailUrl = ({
  nodeType,
  nodeName,
  to,
  from,
}: {
  nodeType: InfraNodeType;
  nodeName: string;
  to?: number;
  from?: number;
}) => {
  const args = to && from ? `?to=${to}&from=${from}` : '';
  return `#/link-to/${nodeType}-detail/${nodeName}${args}`;
};
