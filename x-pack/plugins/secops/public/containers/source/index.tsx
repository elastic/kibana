/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import { SourceQuery } from '../../../common/graphql/types';
import { sourceQuery } from './source.gql_query';

interface WithSourceArgs {
  auditbeatIndicesExist: boolean;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  sourceId: string;
}

export const WithSource = ({ children, sourceId }: WithSourceProps) => (
  <Query<SourceQuery.Query, SourceQuery.Variables>
    query={sourceQuery}
    fetchPolicy="no-cache"
    notifyOnNetworkStatusChange
    variables={{ sourceId }}
  >
    {({ data }) =>
      children({
        auditbeatIndicesExist: get('source.status.auditbeatIndicesExist', data),
      })
    }
  </Query>
);
