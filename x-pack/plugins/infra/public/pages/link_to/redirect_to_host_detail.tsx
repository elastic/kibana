/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { replaceStateKeyInQueryString } from '../../utils/url_state';
import { getFromFromLocation, getToFromLocation } from './query_params';
export const RedirectToHostDetail = ({
  match,
  location,
}: RouteComponentProps<{ name: string }>) => {
  const to = getToFromLocation(location);
  const from = getFromFromLocation(location);
  const args =
    to && from
      ? '?' +
        replaceStateKeyInQueryString('metricTime', {
          time: { to, from },
        })('')
      : '';
  return <Redirect to={`/metrics/host/${match.params.name}${args}`} />;
};

export const getHostDetailUrl = ({
  name,
  to,
  from,
}: {
  name: string;
  to?: number;
  from?: number;
}) => {
  const args = to && from ? `?to=${to}&from=${from}` : '';
  return `#/link-to/host-detail/${name}${args}`;
};
