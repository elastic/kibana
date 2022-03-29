/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecurityPageName } from '../../../../common/constants';
import { NetworkRouteType } from '../../../network/pages/navigation/types';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { LensAttributes, GetLensAttributes } from './types';
import {
  getHostDetailsPageFilter,
  filterNetworkExternalAlertData,
  filterHostExternalAlertData,
  getIndexFilters,
} from './utils';

export const useLensAttributes = ({
  lensAttributes,
  getLensAttributes,
  stackByField,
}: {
  lensAttributes?: LensAttributes | null;
  getLensAttributes?: GetLensAttributes;
  stackByField?: string;
}): LensAttributes | null => {
  const { selectedPatterns, dataViewId } = useSourcererDataView();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const [{ detailName, pageName, tabName }] = useRouteSpy();

  const tabsFilters = useMemo(() => {
    if (pageName === SecurityPageName.hosts && tabName === 'externalAlerts') {
      return filterHostExternalAlertData;
    }

    if (pageName === SecurityPageName.network && tabName === NetworkRouteType.alerts) {
      return filterNetworkExternalAlertData;
    }

    return [];
  }, [pageName, tabName]);

  const pageFilters = useMemo(() => {
    if (pageName === SecurityPageName.hosts && detailName != null) {
      return getHostDetailsPageFilter(detailName);
    }
    return [];
  }, [detailName, pageName]);

  const indexFilters = useMemo(() => getIndexFilters(selectedPatterns), [selectedPatterns]);

  const lensAttrsWithInjectedData = useMemo(() => {
    if (lensAttributes == null && (getLensAttributes == null || stackByField == null)) {
      return null;
    }
    const attrs: LensAttributes =
      lensAttributes ??
      ((getLensAttributes && stackByField && getLensAttributes(stackByField)) as LensAttributes);

    return {
      ...attrs,
      state: {
        ...attrs.state,
        query,
        filters: [
          ...attrs.state.filters,
          ...filters,
          ...pageFilters,
          ...tabsFilters,
          ...indexFilters,
        ],
      },
      references: attrs.references.map((ref: { id: string; name: string; type: string }) => ({
        ...ref,
        id: dataViewId,
      })),
    } as LensAttributes;
  }, [
    lensAttributes,
    getLensAttributes,
    stackByField,
    query,
    filters,
    pageFilters,
    tabsFilters,
    indexFilters,
    dataViewId,
  ]);

  return lensAttrsWithInjectedData;
};
