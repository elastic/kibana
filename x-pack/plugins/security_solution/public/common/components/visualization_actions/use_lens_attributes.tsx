/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecurityPageName } from '../../../../common/constants';
import { HostsTableType } from '../../../explore/hosts/store/model';
import { NetworkRouteType } from '../../../explore/network/pages/navigation/types';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import type { LensAttributes, GetLensAttributes } from './types';
import {
  getHostDetailsPageFilter,
  sourceOrDestinationIpExistsFilter,
  hostNameExistsFilter,
  getIndexFilters,
} from './utils';

export const useLensAttributes = ({
  lensAttributes,
  getLensAttributes,
  stackByField,
  title,
}: {
  lensAttributes?: LensAttributes | null;
  getLensAttributes?: GetLensAttributes;
  stackByField?: string;
  title?: string;
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
    if (pageName === SecurityPageName.hosts && tabName === HostsTableType.events) {
      return hostNameExistsFilter;
    }

    if (pageName === SecurityPageName.network && tabName === NetworkRouteType.events) {
      return sourceOrDestinationIpExistsFilter;
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
      ...(title != null ? { title } : {}),
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
    title,
    query,
    filters,
    pageFilters,
    tabsFilters,
    indexFilters,
    dataViewId,
  ]);

  return lensAttrsWithInjectedData;
};
