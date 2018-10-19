/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { createQueryStringForDetailTime } from './create_query_string_for_detail_time';

export const RedirectToPodDetail = ({ match, location }: RouteComponentProps<{ name: string }>) => {
  const args = createQueryStringForDetailTime(location);
  return <Redirect to={`/metrics/pod/${match.params.name}${args}`} />;
};

export const getPodDetailUrl = ({
  name,
  to,
  from,
}: {
  name: string;
  to?: number;
  from?: number;
}) => {
  const args = to && from ? `?to=${to}&from=${from}` : '';
  return `#/link-to/pod-detail/${name}${args}`;
};
