/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';
import { WhoAmIQuery } from '../../../common/graphql/types';

import { whoAmIQuery } from './who_am_I.gql_query';

interface WHoAmIArgs {
  appName: string;
}

interface WHoAmIProps {
  children: (args: WHoAmIArgs) => React.ReactNode;
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
        appName:
          data && data.source && data.source.whoAmI ? data.source.whoAmI.appName : 'Who am I ?',
      })
    }
  </Query>
);
