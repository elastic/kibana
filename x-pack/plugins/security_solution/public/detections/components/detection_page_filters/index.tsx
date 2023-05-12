/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { FilterGroupLoading } from '../../../common/components/filter_group/loading';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../../common/constants';
import { FilterGroup } from '../../../common/components/filter_group';
import { useSecuritySolutionUserSettings } from '../../../common/user_settings/use_security_solution_user_settings';
import { getPanelsInOrderFromControlsInput } from '../../../common/components/filter_group/utils';

type FilterItemSetProps = Omit<ComponentProps<typeof FilterGroup>, 'initialControls' | 'onSave'> & {
  activeTemplateId?: string;
};

const GET_USER_SETTING_ID = (uniqueId: string) => {
  return `detection-page-filterSet.${uniqueId}`;
};

const FilterItemSetComponent = (props: FilterItemSetProps) => {
  const {
    dataViewId,
    onFilterChange,
    activeTemplateId = 'defaultTemplate',
    ...restFilterItemGroupProps
  } = props;

  const [loadingPageFilters, setLoadingPageFilters] = useState(true);

  const { getUserSetting, setUserSettings } = useSecuritySolutionUserSettings();
  const controlsBasedonTemplate = useMemo(() => {
    const templateFilters = getUserSetting<ControlGroupInput>(
      'alertsPage',
      GET_USER_SETTING_ID(activeTemplateId)
    );

    if (!templateFilters) return DEFAULT_DETECTION_PAGE_FILTERS;

    const savedFilterControls = getPanelsInOrderFromControlsInput(templateFilters);

    const sanitizedControls =
      savedFilterControls && savedFilterControls.length > 0
        ? savedFilterControls
        : DEFAULT_DETECTION_PAGE_FILTERS;

    console.log({ sanitizedControls, savedFilterControls });

    return sanitizedControls;
  }, [activeTemplateId, getUserSetting]);

  console.log({ controlsBasedonTemplate });

  const [initialFilterControls, setInitialFilterControls] = useState(controlsBasedonTemplate);

  useEffect(() => {
    setLoadingPageFilters(true);
    // get Latest Template based alert page filters settings

    setTimeout(() => {
      setLoadingPageFilters(false);
    }, 500);
  }, [activeTemplateId]);

  const handleFilterSetSave = useCallback(
    (controlGroupInput: ControlGroupInput) => {
      console.log('saving Setting', controlGroupInput);
      setUserSettings('alertsPage', GET_USER_SETTING_ID(activeTemplateId), controlGroupInput);
    },
    [setUserSettings, activeTemplateId]
  );

  const {
    services: { dataViews: dataViewService },
  } = useKibana();

  useEffect(() => {
    // this makes sure, that if fields are not present in existing copy of the
    // dataView, clear the cache before filter group is loaded. This is only
    // applicable to `alert` page as new alert mappings are added when first alert
    // is encountered
    (async () => {
      const dataView = await dataViewService.get(dataViewId ?? '');
      if (!dataView) return;
      for (const filter of DEFAULT_DETECTION_PAGE_FILTERS) {
        const fieldExists = dataView.getFieldByName(filter.fieldName);
        if (!fieldExists) {
          dataViewService.clearInstanceCache(dataViewId ?? '');
          setLoadingPageFilters(false);
          return;
        }
      }
      setLoadingPageFilters(false);
    })();
  }, [dataViewId, dataViewService]);

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
      onSave={handleFilterSetSave}
      uniqueControlId={activeTemplateId}
      dataViewId={dataViewId}
      onFilterChange={filterChangesHandler}
      initialControls={controlsBasedonTemplate}
      {...restFilterItemGroupProps}
    />
  );
};

const arePropsEqual = (prevProps: FilterItemSetProps, newProps: FilterItemSetProps) => {
  const _isEqual = isEqual(prevProps, newProps);
  return _isEqual;
};

export const DetectionPageFilterSet = React.memo(FilterItemSetComponent, arePropsEqual);
