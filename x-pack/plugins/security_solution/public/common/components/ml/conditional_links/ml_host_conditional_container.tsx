/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import React from 'react';

import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';

import { url as urlUtils } from '@kbn/kibana-utils-plugin/public';
import { addEntitiesToKql } from './add_entities_to_kql';
import { replaceKQLParts } from './replace_kql_parts';
import { emptyEntity, multipleEntities, getMultipleEntities } from './entity_helpers';
import { HostsTableType } from '../../../../hosts/store/model';
import { HOSTS_PATH } from '../../../../../common/constants';
interface QueryStringType {
  '?_g': string;
  query: string | null;
  timerange: string | null;
}

export const MlHostConditionalContainer = React.memo(() => {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route
        strict
        exact
        path={path}
        render={({ location }) => {
          const queryStringDecoded = parse(location.search.substring(1), {
            sort: false,
          }) as Required<QueryStringType>;

          if (queryStringDecoded.query != null) {
            queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
          }
          const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
            sort: false,
            encode: false,
          });
          return <Redirect to={`${HOSTS_PATH}?${reEncoded}`} />;
        }}
      />
      <Route
        path={`${path}/:hostName`}
        render={({
          location,
          match: {
            params: { hostName },
          },
        }) => {
          const queryStringDecoded = parse(location.search.substring(1), {
            sort: false,
          }) as Required<QueryStringType>;

          if (queryStringDecoded.query != null) {
            queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
          }
          if (emptyEntity(hostName)) {
            const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
              sort: false,
              encode: false,
            });

            return <Redirect to={`${HOSTS_PATH}/${HostsTableType.anomalies}?${reEncoded}`} />;
          } else if (multipleEntities(hostName)) {
            const hosts: string[] = getMultipleEntities(hostName);
            queryStringDecoded.query = addEntitiesToKql(
              ['host.name'],
              hosts,
              queryStringDecoded.query || ''
            );
            const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
              sort: false,
              encode: false,
            });

            return <Redirect to={`${HOSTS_PATH}/${HostsTableType.anomalies}?${reEncoded}`} />;
          } else {
            const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
              sort: false,
              encode: false,
            });

            return (
              <Redirect to={`${HOSTS_PATH}/${hostName}/${HostsTableType.anomalies}?${reEncoded}`} />
            );
          }
        }}
      />
      <Route
        path={`${HOSTS_PATH}/ml-hosts/`}
        render={({ location: { search = '' } }) => (
          <Redirect from={`${HOSTS_PATH}/ml-hosts/`} to={`${HOSTS_PATH}/ml-hosts${search}`} />
        )}
      />
    </Switch>
  );
});

MlHostConditionalContainer.displayName = 'MlHostConditionalContainer';
