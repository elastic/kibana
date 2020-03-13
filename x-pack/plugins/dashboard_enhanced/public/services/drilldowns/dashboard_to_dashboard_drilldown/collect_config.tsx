/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { CollectConfigProps } from './types';
import { DashboardDrilldownConfig } from '../../../components/dashboard_drilldown_config';
import { Params } from './drilldown';
import { SimpleSavedObject } from '../../../../../../../src/core/public';

export interface CollectConfigContainerProps extends CollectConfigProps {
  params: Params;
}

export const CollectConfigContainer: React.FC<CollectConfigContainerProps> = ({
  config,
  onConfig,
  params: { getSavedObjectsClient },
}) => {
  const [dashboards, setDashboards] = useState([]);
  const [searchString, setSearchString] = useState();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getSavedObjectsClient().then(savedObjectsClient => {
      savedObjectsClient
        .find({
          type: 'dashboard',
          search: searchString ? `${searchString}*` : undefined,
          // todo search by id
          searchFields: ['title^3', 'description'],
          defaultSearchOperator: 'AND',
          perPage: 100,
        })
        .then(({ savedObjects }) => {
          const dashboardList = savedObjects.map(
            (savedObject: SimpleSavedObject<{ id: string; title: string }>) => ({
              id: savedObject.id,
              title: savedObject.attributes.title,
            })
          );
          setDashboards(dashboardList);
          setIsLoading(false);
        });
    });
  }, [getSavedObjectsClient, searchString]);

  return (
    <DashboardDrilldownConfig
      activeDashboardId={config.dashboardId}
      dashboards={dashboards}
      currentFilters={config.useCurrentDashboardFilters}
      keepRange={config.useCurrentDashboardDataRange}
      isLoading={isLoading}
      onDashboardSelect={dashboardId => {
        onConfig({ ...config, dashboardId });
      }}
      onSearchChange={setSearchString}
      onCurrentFiltersToggle={() =>
        onConfig({
          ...config,
          useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
        })
      }
      onKeepRangeToggle={() =>
        onConfig({
          ...config,
          useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
        })
      }
    />
  );
};
