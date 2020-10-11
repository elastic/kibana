/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import React from 'react';
import { useLocation, useParams, Redirect, Route, Switch } from 'react-router-dom';

import { addEntitiesToKql } from './add_entities_to_kql';
import { replaceKQLParts } from './replace_kql_parts';
import { emptyEntity, getMultipleEntities, multipleEntities } from './entity_helpers';
import { RedirectWithSearch } from '../../redirect_with_search';

import { url as urlUtils } from '../../../../../../../../src/plugins/kibana_utils/public';

interface QueryStringType {
  '?_g': string;
  query: string | null;
  timerange: string | null;
}

const RootPathRouteComponent = () => {
  const { search } = useLocation();
  const queryStringDecoded = parse(search, {
    sort: false,
  }) as Required<QueryStringType>;

  if (queryStringDecoded.query != null) {
    queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
  }

  const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
    sort: false,
    encode: false,
  });

  return <Redirect to={`?${reEncoded}`} />;
};

RootPathRouteComponent.displayName = 'RootPathRouteComponent';

const RootPathRoute = React.memo(RootPathRouteComponent);

RootPathRoute.displayName = 'RootPathRoute';

const NetworkDetailsPathRouteComponent = () => {
  const { ip } = useParams<{ ip: string }>();
  const { search } = useLocation();

  const queryStringDecoded = parse(search, {
    sort: false,
  }) as Required<QueryStringType>;

  if (queryStringDecoded.query != null) {
    queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
  }

  if (emptyEntity(ip)) {
    const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
      sort: false,
      encode: false,
    });

    return <Redirect to={`?${reEncoded}`} />;
  } else if (multipleEntities(ip)) {
    const ips: string[] = getMultipleEntities(ip);
    queryStringDecoded.query = addEntitiesToKql(
      ['source.ip', 'destination.ip'],
      ips,
      queryStringDecoded.query || ''
    );
    const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
      sort: false,
      encode: false,
    });
    return <Redirect to={`?${reEncoded}`} />;
  } else {
    const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
      sort: false,
      encode: false,
    });
    return <Redirect to={`/ip/${ip}?${reEncoded}`} />;
  }
};

NetworkDetailsPathRouteComponent.displayName = 'NetworkDetailsPathRouteComponent';

const NetworkDetailsPathRoute = React.memo(NetworkDetailsPathRouteComponent);

NetworkDetailsPathRoute.displayName = 'NetworkDetailsPathRoute';

interface MlNetworkConditionalProps {
  url: string;
}

export const MlNetworkConditionalContainer = React.memo<MlNetworkConditionalProps>(({ url }) => (
  <Switch>
    <Route strict exact path={url}>
      <RootPathRoute />
    </Route>
    <Route path={`${url}/ip/:ip`}>
      <NetworkDetailsPathRoute />
    </Route>
    <Route path="/ml-network/">
      <RedirectWithSearch url="/ml-network" />
    </Route>
  </Switch>
));

MlNetworkConditionalContainer.displayName = 'MlNetworkConditionalContainer';
