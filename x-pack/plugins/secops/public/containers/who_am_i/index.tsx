/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';

import { WhoAmIQuery } from '../../../common/graphql/types';

import { whoAmIQuery } from './who_am_i.gql_query';

interface WhoAmIArgs {
  appName: string;
}

interface WHoAmIProps {
  children: (args: WhoAmIArgs) => React.ReactNode;
  sourceId: string;
}

export const WhoAmI = ({ children, sourceId }: WHoAmIProps) => (
  <Query<WhoAmIQuery.Query, WhoAmIQuery.Variables>
    query={whoAmIQuery}
    fetchPolicy="no-cache"
    notifyOnNetworkStatusChange
    variables={{ sourceId }}
  >
    {({ data }) =>
      children({
        appName: get(data, 'source.whoAmI.appName') || 'Who am I ?',
      })
    }
  </Query>
);
