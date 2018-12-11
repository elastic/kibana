/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import React from 'react';
import { Query } from 'react-apollo';
import { ServiceMetadataQuery } from '../../../common/graphql/types';
import { serviceMetadataQuery } from './service_metadata.gql_query';

interface WithServiceMetadataProps {
  children: (args: WithServiceMetadataArgs) => React.ReactNode;
  sourceId: string;
  start: number;
  end: number;
  filterQuery?: string;
}

interface WithServiceMetadataArgs {
  serviceMetadata: any;
  error?: string | undefined;
  loading: boolean;
}

export const WithServiceMetadata = ({
  children,
  sourceId,
  start,
  end,
  filterQuery,
}: WithServiceMetadataProps) => {
  return (
    <Query<ServiceMetadataQuery.Query, ServiceMetadataQuery.Variables>
      query={serviceMetadataQuery}
      fetchPolicy="no-cache"
      variables={{
        sourceId,
        start,
        end,
        filterQuery,
      }}
    >
      {({ data, error, loading }) => {
        const serviceMetadata = data && data.source && data.source.serviceMetadataBetween;
        return children({
          serviceMetadata,
          error: error && error.message,
          loading,
        });
      }}
    </Query>
  );
};
