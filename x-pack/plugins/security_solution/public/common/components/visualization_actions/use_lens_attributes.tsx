/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { SecurityPageName } from '../../../../common/constants';
import { NetworkRouteType } from '../../../network/pages/navigation/types';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { LensAttributes, GetLensAttributes } from './types';
import {
  getHostDetailsPageFilter,
  filterNetworkExternalAlertData,
  filterHostExternalAlertData,
  getIndexFilters,
} from './utils';

export const useLensAttributes = ({
  lensAttributes,
  stackByField,
}: {
  lensAttributes: LensAttributes | GetLensAttributes | null;
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
  const { detailName, tabName } = useParams<{ detailName: string | undefined; tabName: string }>();
  const location = useLocation();
  const tabsFilters = useMemo(() => {
    if (location.pathname.includes(SecurityPageName.hosts) && tabName === 'externalAlerts') {
      return filterHostExternalAlertData;
    }

    if (
      location.pathname.includes(SecurityPageName.network) &&
      tabName === NetworkRouteType.alerts
    ) {
      return filterNetworkExternalAlertData;
    }

    return [];
  }, [tabName, location.pathname]);

  const pageFilters = useMemo(() => {
    if (location.pathname.includes(SecurityPageName.hosts) && detailName != null) {
      return getHostDetailsPageFilter(detailName);
    }
    return [];
  }, [location.pathname, detailName]);

  const indexFilters = useMemo(() => getIndexFilters(selectedPatterns), [selectedPatterns]);

  const lensAttrsWithInjectedData = useMemo(() => {
    if (lensAttributes == null) {
      return null;
    }

    const attrs =
      typeof lensAttributes === 'function' ? lensAttributes(stackByField) : lensAttributes;

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
