/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';

import { replaceMetricTimeInQueryString } from '../../containers/metrics/with_metrics_time';
import { useHostIpToName } from './use_host_ip_to_name';
import { getFromFromLocation, getToFromLocation } from './query_params';
import { WithSource } from '../../containers/with_source';
import { LoadingPage } from '../../components/loading_page';
import { Error } from '../error';

type RedirectToHostDetailProps = RouteComponentProps<{
  hostIp: string;
}>;

export const RedirectToHostDetailViaIP = ({
  match: {
    params: { hostIp },
  },
  location,
}: RedirectToHostDetailProps) => {
  return (
    <WithSource>
      {({ configuration }) => {
        const { loading, error, name } = useHostIpToName(
          hostIp,
          (configuration && configuration.metricAlias) || null
        );

        if (error) {
          return <Error message={`Host not found with IP address "${hostIp}".`} />;
        }

        const searchString = replaceMetricTimeInQueryString(
          getFromFromLocation(location),
          getToFromLocation(location)
        )('');

        if (name) {
          return <Redirect to={`/metrics/host/${name}?${searchString}`} />;
        }

        return <LoadingPage message={`Loading host with IP address "${hostIp}".`} />;
      }}
    </WithSource>
  );
};
