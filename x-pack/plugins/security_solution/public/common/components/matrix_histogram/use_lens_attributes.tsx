/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { SecurityPageName } from '../../../../common/constants';
import { NetworkRouteType } from '../../../network/pages/navigation/types';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import {
  getHostDetailsPageFilter,
  filterNetworkExternalAlertData,
  filterHostExternalAlertData,
} from './utils';

export const useLensAttributes = ({
  lensAttributes,
  getLensAttributes,
  stackByField,
}: {
  lensAttributes?: TypedLensByValueInput['attributes'];
  getLensAttributes?: (params?: { stackByField?: string }) => TypedLensByValueInput['attributes'];
  stackByField?: string;
}): TypedLensByValueInput['attributes'] | null => {
  const { dataViewId } = useSourcererDataView();
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
      return filters.length > 0
        ? [...filters, ...filterHostExternalAlertData]
        : filterHostExternalAlertData;
    }

    if (
      location.pathname.includes(SecurityPageName.network) &&
      tabName === NetworkRouteType.alerts
    ) {
      return filters.length > 0
        ? [...filters, ...filterNetworkExternalAlertData]
        : filterNetworkExternalAlertData;
    }

    return filters;
  }, [tabName, location.pathname, filters]);

  const pageFilters = useMemo(() => {
    if (location.pathname.includes(SecurityPageName.hosts) && detailName != null) {
      return [...filters, ...getHostDetailsPageFilter(detailName)];
    }
    return filters;
  }, [location.pathname, detailName, filters]);

  const lensAttrsWithInjectedData = useMemo(() => {
    const attrs = lensAttributes ?? (getLensAttributes && getLensAttributes({ stackByField }));
    return attrs != null
      ? ({
          ...attrs,
          state: {
            ...attrs.state,
            query,
            filters: [...attrs.state.filters, ...pageFilters, ...tabsFilters],
          },
          references: attrs.references.map((ref: { id: string; name: string; type: string }) => ({
            ...ref,
            id: dataViewId,
          })),
        } as TypedLensByValueInput['attributes'])
      : null;
  }, [
    lensAttributes,
    getLensAttributes,
    stackByField,
    query,
    pageFilters,
    tabsFilters,
    dataViewId,
  ]);

  return lensAttrsWithInjectedData;
};
