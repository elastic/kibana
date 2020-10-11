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
import { emptyEntity, multipleEntities, getMultipleEntities } from './entity_helpers';
import { HostsTableType } from '../../../../hosts/store/model';
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

const HostNamePathRouteComponent = () => {
  const { hostName } = useParams<{ hostName: string }>();
  const { search } = useLocation();

  const queryStringDecoded = parse(search, {
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

    return <Redirect to={`/${HostsTableType.anomalies}?${reEncoded}`} />;
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

    return <Redirect to={`/${HostsTableType.anomalies}?${reEncoded}`} />;
  } else {
    const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
      sort: false,
      encode: false,
    });

    return <Redirect to={`/${hostName}/${HostsTableType.anomalies}?${reEncoded}`} />;
  }
};

HostNamePathRouteComponent.displayName = 'HostNamePathRouteComponent';

const HostNamePathRoute = React.memo(HostNamePathRouteComponent);

HostNamePathRoute.displayName = 'HostNamePathRoute';

interface MlHostConditionalProps {
  url: string;
}

export const MlHostConditionalContainer = React.memo<MlHostConditionalProps>(({ url }) => (
  <Switch>
    <Route strict exact path={url}>
      <RootPathRoute />
    </Route>
    <Route path={`${url}/:hostName`}>
      <HostNamePathRoute />
    </Route>
    <Route path="/ml-hosts/">
      <RedirectWithSearch url="/ml-hosts" />
    </Route>
  </Switch>
));

MlHostConditionalContainer.displayName = 'MlHostConditionalContainer';
