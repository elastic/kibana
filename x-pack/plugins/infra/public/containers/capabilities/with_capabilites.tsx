/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import React from 'react';
import { Query } from 'react-apollo';
import { CapabilitiesQuery, InfraNodeType } from '../../../common/graphql/types';
import { InfraMetricLayout } from '../../pages/metrics/layouts/types';
import { capabilitiesQuery } from './capabilities.gql_query';

interface WithCapabilitiesProps {
  children: (args: WithCapabilitiesArgs) => React.ReactNode;
  layouts: InfraMetricLayout[];
  nodeType: InfraNodeType;
  nodeId: string;
  sourceId: string;
}

interface WithCapabilitiesArgs {
  filteredLayouts: InfraMetricLayout[];
  error?: string | undefined;
  loading: boolean;
}

export const WithCapabilities = ({
  children,
  layouts,
  nodeType,
  nodeId,
  sourceId,
}: WithCapabilitiesProps) => {
  return (
    <Query<CapabilitiesQuery.Query, CapabilitiesQuery.Variables>
      query={capabilitiesQuery}
      fetchPolicy="no-cache"
      variables={{
        sourceId,
        nodeType,
        nodeId,
      }}
    >
      {({ data, error, loading }) => {
        const capabilities = data && data.source && data.source.capabilitiesByNode;
        const filteredLayouts = getFilteredLayouts(layouts, capabilities);
        return children({
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
  capabilities: Array<CapabilitiesQuery.CapabilitiesByNode | null> | undefined
): InfraMetricLayout[] => {
  if (!capabilities) {
    return layouts;
  }

  const metricCapabilities: Array<string | null> = capabilities
    .filter(cap => cap && cap.source === 'metrics')
    .map(cap => cap && cap.name);

  // After filtering out sections that can't be displayed, a layout may end up empty and can be removed.
  const filteredLayouts = layouts
    .map(layout => getFilteredLayout(layout, metricCapabilities))
    .filter(layout => layout.sections.length > 0);
  return filteredLayouts;
};

const getFilteredLayout = (
  layout: InfraMetricLayout,
  metricCapabilities: Array<string | null>
): InfraMetricLayout => {
  // A section is only displayed if at least one of its requirements is met
  // All others are filtered out.
  const filteredSections = layout.sections.filter(
    section => _.intersection(section.requires, metricCapabilities).length > 0
  );
  return { ...layout, sections: filteredSections };
};
