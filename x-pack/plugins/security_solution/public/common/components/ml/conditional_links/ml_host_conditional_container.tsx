/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import React from 'react';

import { Navigate, Routes, useLocation, useParams } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

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

const Main = () => {
  const { search = '' } = useParams<{ search: string }>();
  const queryStringDecoded = parse(search.substring(1), {
    sort: false,
  }) as Required<QueryStringType>;

  if (queryStringDecoded.query != null) {
    queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
  }
  const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
    sort: false,
    encode: false,
  });

  return <Navigate to={`${HOSTS_PATH}?${reEncoded}`} />;
};

const Hostname = () => {
  const { search = '', hostName = '' } = useParams<{ search: string; hostName: string }>();
  const queryStringDecoded = parse(search.substring(1), {
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

    return <Navigate to={`${HOSTS_PATH}/${HostsTableType.anomalies}?${reEncoded}`} />;
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

    return <Navigate to={`${HOSTS_PATH}/${HostsTableType.anomalies}?${reEncoded}`} />;
  } else {
    const reEncoded = stringify(urlUtils.encodeQuery(queryStringDecoded), {
      sort: false,
      encode: false,
    });

    return (
      <Navigate to={`${HOSTS_PATH}/name/${hostName}/${HostsTableType.anomalies}?${reEncoded}`} />
    );
  }
};

const MlHosts = () => {
  const { search = '' } = useParams<{ search: string }>();
  return <Navigate to={`${HOSTS_PATH}/ml-hosts${search}`} />;
};

export const MlHostConditionalContainer = React.memo(() => {
  const { pathname } = useLocation();
  return (
    <Routes>
      <Route path={pathname} render={() => <Main />} />
      <Route path={`${pathname}/:hostName`} render={() => <Hostname />} />
      <Route path={`${HOSTS_PATH}/ml-hosts/`} render={() => <MlHosts />} />
    </Routes>
  );
});

MlHostConditionalContainer.displayName = 'MlHostConditionalContainer';
