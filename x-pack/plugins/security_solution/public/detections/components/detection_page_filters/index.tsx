/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { FilterGroupLoading } from '../../../common/components/filter_group/loading';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../../common/constants';
import { FilterGroup } from '../../../common/components/filter_group';
import { useSourcererDataView } from '../../../common/containers/sourcerer';

type FilterItemSetProps = Omit<
  ComponentProps<typeof FilterGroup>,
  'initialControls' | 'dataViewId'
>;

const DATA_VIEW_NAME = 'SECURITY_SOLUTION_AD_HOC_ALERTS_DATA_VIEW';

const FilterItemSetComponent = (props: FilterItemSetProps) => {
  const { onFilterChange, ...restFilterItemGroupProps } = props;

  const {
    indexPattern: { title },
  } = useSourcererDataView(SourcererScopeName.detections);

  const [loadingPageFilters, setLoadingPageFilters] = useState(true);

  const {
    services: { dataViews: dataViewService },
  } = useKibana();

  useEffect(() => {
    // this makes sure, that if fields are not present in existing copy of the
    // dataView, clear the cache before filter group is loaded. This is only
    // applicable to `alert` page as new alert mappings are added when first alert
    // is encountered
    (async () => {
      const localDataViewId = title;
      let dataView;
      try {
        dataView = await dataViewService.get(localDataViewId ?? '');
      } catch (error) {
        // creates an adhoc dataview if it does not already exists just for alert index
        dataView = await dataViewService.create({
          id: DATA_VIEW_NAME,
          name: DATA_VIEW_NAME,
          title: localDataViewId,
          allowNoIndex: true,
        });
      }
      for (const filter of DEFAULT_DETECTION_PAGE_FILTERS) {
        const fieldExists = dataView.getFieldByName(filter.fieldName);
        if (!fieldExists) {
          dataViewService.clearInstanceCache(localDataViewId ?? '');
          setLoadingPageFilters(false);
          return;
        }
      }
      setLoadingPageFilters(false);
    })();
  }, [title, dataViewService]);

  const [initialFilterControls] = useState(DEFAULT_DETECTION_PAGE_FILTERS);

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
      dataViewId={DATA_VIEW_NAME}
      onFilterChange={filterChangesHandler}
      initialControls={initialFilterControls}
      {...restFilterItemGroupProps}
    />
  );
};

const arePropsEqual = (prevProps: FilterItemSetProps, newProps: FilterItemSetProps) => {
  const _isEqual = isEqual(prevProps, newProps);
  return _isEqual;
};

export const DetectionPageFilterSet = React.memo(FilterItemSetComponent, arePropsEqual);
