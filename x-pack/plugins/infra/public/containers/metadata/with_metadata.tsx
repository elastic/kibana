/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Query } from 'react-apollo';

import { InfraNodeType, MetadataQuery } from '../../graphql/types';
import { InfraMetricLayout } from '../../pages/metrics/layouts/types';
import { metadataQuery } from './metadata.gql_query';

interface WithMetadataProps {
  children: (args: WithMetadataArgs) => React.ReactNode;
  layouts: InfraMetricLayout[];
  nodeType: InfraNodeType;
  nodeId: string;
  sourceId: string;
}

interface WithMetadataArgs {
  name: string;
  filteredLayouts: InfraMetricLayout[];
  error?: string | undefined;
  loading: boolean;
}

export const WithMetadata = ({
  children,
  layouts,
  nodeType,
  nodeId,
  sourceId,
}: WithMetadataProps) => {
  return (
    <Query<MetadataQuery.Query, MetadataQuery.Variables>
      query={metadataQuery}
      fetchPolicy="no-cache"
      variables={{
        sourceId,
        nodeType,
        nodeId,
      }}
    >
      {({ data, error, loading }) => {
        const metadata = data && data.source && data.source.metadataByNode;
        const filteredLayouts = (metadata && getFilteredLayouts(layouts, metadata.features)) || [];
        return children({
          name: (metadata && metadata.name) || '',
          filteredLayouts,
          error: error && error.message,
          loading,
        });
      }}
    </Query>
  );
};

const getFilteredLayouts = (
  layouts: InfraMetricLayout[],
  metadata: Array<MetadataQuery.Features | null> | undefined
): InfraMetricLayout[] => {
  if (!metadata) {
    return layouts;
  }

  const metricMetadata: Array<string | null> = metadata
    .filter(data => data && data.source === 'metrics')
    .map(data => data && data.name);

  // After filtering out sections that can't be displayed, a layout may end up empty and can be removed.
  const filteredLayouts = layouts
    .map(layout => getFilteredLayout(layout, metricMetadata))
    .filter(layout => layout.sections.length > 0);
  return filteredLayouts;
};

const getFilteredLayout = (
  layout: InfraMetricLayout,
  metricMetadata: Array<string | null>
): InfraMetricLayout => {
  // A section is only displayed if at least one of its requirements is met
  // All others are filtered out.
  const filteredSections = layout.sections.filter(
    section => _.intersection(section.requires, metricMetadata).length > 0
  );
  return { ...layout, sections: filteredSections };
};
