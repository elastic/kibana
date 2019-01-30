/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { StaticIndexPattern } from 'ui/index_patterns';

import { isUndefined } from 'lodash';
import { SourceQuery } from '../../graphql/types';
import { sourceQuery } from './index.gql_query';

interface WithSourceArgs {
  auditbeatIndicesExist: boolean;
  indexPattern: StaticIndexPattern;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  sourceId: string;
}

export const WithSource = ({ children, sourceId }: WithSourceProps) => (
  <Query<SourceQuery.Query, SourceQuery.Variables>
    query={sourceQuery}
    fetchPolicy="cache-first"
    notifyOnNetworkStatusChange
    variables={{ sourceId }}
  >
    {({ data }) => {
      const logAlias = get('source.configuration.logAlias', data);
      const auditbeatAlias = get('source.configuration.auditbeatAlias', data);
      const packetbeatAlias = get('source.configuration.packetbeatAlias', data);
      return children({
        auditbeatIndicesExist: get('source.status.auditbeatIndicesExist', data),
        indexPattern: {
          fields: get('source.status.indexFields', data),
          title: `${logAlias},${auditbeatAlias},${packetbeatAlias}`,
        },
      });
    }}
  </Query>
);

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);
