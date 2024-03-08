/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useAlertDataView } from '@kbn/alerts-ui-shared';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { FilterGroupLoading } from './loading';
import { DEFAULT_FILTERS } from './constants';
import { FilterGroup } from './filter_group';
import { FilterItemObj } from './types';
import { useKibana } from '../../../common/lib/kibana';

type AlertsFiltersProps = Omit<
  ComponentProps<typeof FilterGroup>,
  'defaultControls' | 'dataViewId'
> & {
  dataViewsService: DataViewsPublicPluginStart;
  controlsFromUrl: FilterItemObj[];
};

const UNIFIED_ALERTS_DATA_VIEW = {
  id: 'unified-alerts',
  name: 'Unified Alerts DataView',
};

const AlertsFiltersComponent = (props: AlertsFiltersProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { onFilterChange, dataViewsService, ...restFilterItemGroupProps } = props;
  const [loadingPageFilters, setLoadingPageFilters] = useState(true);
  const { dataViews } = useAlertDataView({
    featureIds: [AlertConsumers.STACK_ALERTS],
    dataViewsService,
    http,
    toasts,
  });

  console.log('Data views', dataViews);

  useEffect(() => {
    if (dataViews?.[0]?.title) {
      (async () => {
        // Creates an adhoc dataview if it does not already exist just for alert index
        await dataViewsService.create({
          id: UNIFIED_ALERTS_DATA_VIEW.id,
          name: UNIFIED_ALERTS_DATA_VIEW.name,
          allowNoIndex: true,
          timeFieldName: '@timestamp',
          title: '.alerts-*',
        });
        setLoadingPageFilters(false);
      })();
    }

    return () => dataViewsService.clearInstanceCache();
  }, [dataViews, dataViewsService]);

  const [initialFilterControls] = useState(DEFAULT_FILTERS);

  const filterChangesHandler = useCallback(
    (newFilters: Filter[]) => {
      if (!onFilterChange) {
        return;
      }
      const updatedFilters = newFilters.map((filter) => {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            disabled: false,
          },
        };
      });

      onFilterChange(updatedFilters);
    },
    [onFilterChange]
  );

  if (loadingPageFilters) {
    return (
      <EuiFlexItem grow={true}>
        <FilterGroupLoading />
      </EuiFlexItem>
    );
  }

  return (
    <FilterGroup
      dataViewId={UNIFIED_ALERTS_DATA_VIEW.id}
      onFilterChange={filterChangesHandler}
      defaultControls={initialFilterControls}
      {...restFilterItemGroupProps}
    />
  );
};

const arePropsEqual = (prevProps: AlertsFiltersProps, newProps: AlertsFiltersProps) => {
  return isEqual(prevProps, newProps);
};

export const AlertsFilters = React.memo(AlertsFiltersComponent, arePropsEqual);
