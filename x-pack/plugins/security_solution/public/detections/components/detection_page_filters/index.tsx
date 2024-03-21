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
import type { SecuritySolutionUserSettingPath } from '../../../common/hooks/use_user_settings';
import { useSecuritySolutionUserSettings } from '../../../common/hooks/use_user_settings';
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

const SECURITY_ALERT_DATA_VIEW = {
  id: 'security_solution_alerts_dv',
  name: 'Security Solution Alerts DataView',
};

const pageFiltersUserSetting: SecuritySolutionUserSettingPath = {
  module: 'ALERT',
  key: 'pageFilters',
};

const FilterItemSetComponent = (props: FilterItemSetProps) => {
  const { onFilterChange, ...restFilterItemGroupProps } = props;

  const {
    getCurrent,
    userSettings: savedPageFilters,
    update,
    userSettingsLoadStatus,
  } = useSecuritySolutionUserSettings<typeof DEFAULT_DETECTION_PAGE_FILTERS>(
    pageFiltersUserSetting
  );

  console.log({ savedPageFilters });

  useEffect(() => {
    async function updateDefaultDetectionPageFilters() {
      if (userSettingsLoadStatus === 'pending') return;
      if (!(await getCurrent())) {
        await update(DEFAULT_DETECTION_PAGE_FILTERS);
        await getCurrent();
      }
    }
    updateDefaultDetectionPageFilters();
  }, [savedPageFilters, update, getCurrent, userSettingsLoadStatus]);

  const {
    indexPattern: { title },
    dataViewId,
  } = useSourcererDataView(SourcererScopeName.detections);

  const [loadingPageFilters, setLoadingPageFilters] = useState(true);

  const {
    services: { dataViews: dataViewService },
  } = useKibana();

  useEffect(() => {
    (async () => {
      // creates an adhoc dataview if it does not already exists just for alert index
      const { timeFieldName = '@timestamp' } = await dataViewService.get(dataViewId ?? '');
      await dataViewService.create({
        id: SECURITY_ALERT_DATA_VIEW.id,
        name: SECURITY_ALERT_DATA_VIEW.name,
        title,
        allowNoIndex: true,
        timeFieldName,
      });
      setLoadingPageFilters(false);
    })();

    return () => dataViewService.clearInstanceCache();
  }, [title, dataViewService, dataViewId]);

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

  const isLoading = loadingPageFilters || !savedPageFilters;

  const onControlsUpdate = useCallback(
    async (newControls: typeof DEFAULT_DETECTION_PAGE_FILTERS) => {
      await update(newControls);
      await getCurrent();
    },
    [update, getCurrent]
  );

  if (isLoading) {
    return (
      <EuiFlexItem grow={true}>
        <FilterGroupLoading />
      </EuiFlexItem>
    );
  }

  return (
    <FilterGroup
      dataViewId={SECURITY_ALERT_DATA_VIEW.id}
      onFilterChange={filterChangesHandler}
      initialControls={savedPageFilters}
      onControlsUpdate={onControlsUpdate}
      {...restFilterItemGroupProps}
    />
  );
};

const arePropsEqual = (prevProps: FilterItemSetProps, newProps: FilterItemSetProps) => {
  const _isEqual = isEqual(prevProps, newProps);
  return _isEqual;
};

export const DetectionPageFilterSet = React.memo(FilterItemSetComponent, arePropsEqual);
