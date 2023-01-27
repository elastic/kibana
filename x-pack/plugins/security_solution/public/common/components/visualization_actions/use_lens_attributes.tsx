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
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import type { LensAttributes, GetLensAttributes, ExtraOptions } from './types';
import {
  getDetailsPageFilter,
  sourceOrDestinationIpExistsFilter,
  hostNameExistsFilter,
  getIndexFilters,
  getNetworkDetailsPageFilter,
} from './utils';

export const useLensAttributes = ({
  applyGlobalQueriesAndFilters = true,
  extraOptions,
  getLensAttributes,
  lensAttributes,
  scopeId = SourcererScopeName.default,
  stackByField,
  title,
}: {
  applyGlobalQueriesAndFilters?: boolean;
  extraOptions?: ExtraOptions;
  getLensAttributes?: GetLensAttributes;
  lensAttributes?: LensAttributes | null;
  scopeId?: SourcererScopeName;
  stackByField?: string;
  title?: string;
}): LensAttributes | null => {
  const { selectedPatterns, dataViewId, indicesExist } = useSourcererDataView(scopeId);
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
    if (
      [SecurityPageName.hosts, SecurityPageName.users].indexOf(pageName) >= 0 &&
      detailName != null
    ) {
      return getDetailsPageFilter(pageName, detailName);
    }

    if (SecurityPageName.network === pageName) {
      return getNetworkDetailsPageFilter(detailName);
    }

    return [];
  }, [detailName, pageName]);

  const attrs: LensAttributes = useMemo(
    () =>
      lensAttributes ??
      ((getLensAttributes &&
        stackByField &&
        getLensAttributes(stackByField, extraOptions)) as LensAttributes),
    [extraOptions, getLensAttributes, lensAttributes, stackByField]
  );

  const hasAdHocDataViews = Object.values(attrs?.state?.adHocDataViews ?? {}).length > 0;

  const lensAttrsWithInjectedData = useMemo(() => {
    if (
      lensAttributes == null &&
      (getLensAttributes == null || stackByField == null || stackByField?.length === 0)
    ) {
      return null;
    }

    const indexFilters = hasAdHocDataViews ? [] : getIndexFilters(selectedPatterns);
    return {
      ...attrs,
      ...(title != null ? { title } : {}),
      state: {
        ...attrs.state,
        ...(applyGlobalQueriesAndFilters ? { query } : {}),
        filters: [
          ...attrs.state.filters,
          ...(applyGlobalQueriesAndFilters ? filters : []),
          ...pageFilters,
          ...tabsFilters,
          ...indexFilters,
        ],
      },
      references: attrs?.references?.map((ref: { id: string; name: string; type: string }) => ({
        ...ref,
        id: dataViewId,
      })),
    } as LensAttributes;
  }, [
    applyGlobalQueriesAndFilters,
    attrs,
    dataViewId,
    filters,
    getLensAttributes,
    hasAdHocDataViews,
    lensAttributes,
    pageFilters,
    query,
    selectedPatterns,
    stackByField,
    tabsFilters,
    title,
  ]);
  return hasAdHocDataViews || (!hasAdHocDataViews && indicesExist)
    ? lensAttrsWithInjectedData
    : null;
};
