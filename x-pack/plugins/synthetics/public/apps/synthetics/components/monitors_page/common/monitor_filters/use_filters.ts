/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';

import { ConfigKey } from '../../../../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../../../../common/types/saved_objects';
import {
  MonitorFilterState,
  selectMonitorFiltersAndQueryState,
  setOverviewPageStateAction,
  updateManagementPageStateAction,
} from '../../../../state';
import { SyntheticsUrlParams } from '../../../../utils/url_params';
import { useUrlParams } from '../../../../hooks';

import {
  SyntheticsMonitorFilterField,
  getMonitorFilterFields,
  getSyntheticsFilterKeyForLabel,
  SyntheticsMonitorFilterChangeHandler,
} from './filter_fields';

const aggs = {
  monitorTypes: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.MONITOR_TYPE}.keyword`,
      size: 10000,
    },
  },
  tags: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.TAGS}`,
      size: 10000,
    },
  },
  locations: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
    },
  },
  projects: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}`,
      size: 10000,
    },
  },
  schedules: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.${ConfigKey.SCHEDULE}.number`,
      size: 10000,
    },
  },
};

type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

interface AggsResponse {
  monitorTypes: {
    buckets: Buckets;
  };
  locations: {
    buckets: Buckets;
  };
  tags: {
    buckets: Buckets;
  };
  projects: {
    buckets: Buckets;
  };
  schedules: {
    buckets: Buckets;
  };
}

export const useFilters = (): Record<
  SyntheticsMonitorFilterField,
  Array<{ label: string; count: number }>
> => {
  const { savedObjects } = useKibana().services;

  const { data } = useFetcher(async () => {
    return savedObjects?.client.find({
      type: syntheticsMonitorType,
      perPage: 0,
      aggs,
    });
  }, []);

  return useMemo(() => {
    const { monitorTypes, tags, locations, projects, schedules } =
      (data?.aggregations as AggsResponse) ?? {};
    return {
      monitorTypes:
        monitorTypes?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      tags:
        tags?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      locations:
        locations?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      projects:
        projects?.buckets
          ?.filter(({ key }) => key)
          .map(({ key, doc_count: count }) => ({
            label: key,
            count,
          })) ?? [],
      schedules:
        schedules?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
    };
  }, [data]);
};

type FilterFieldWithQuery = SyntheticsMonitorFilterField | 'query';
type FilterStateWithQuery = MonitorFilterState & { query?: string };

export function useMonitorFiltersState() {
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const urlParams = getUrlParams();

  const filterFieldsWithQuery: FilterFieldWithQuery[] = useMemo(() => {
    const filterFields = getMonitorFilterFields();
    return [...filterFields, 'query'];
  }, []);

  const dispatch = useDispatch();

  const serializeFilterValue = useCallback(
    (field: FilterFieldWithQuery, selectedValues: string[] | undefined) => {
      if (field === 'query') {
        return selectedValues?.length ? selectedValues.toString() : undefined;
      }

      return selectedValues && selectedValues.length > 0
        ? JSON.stringify(
            selectedValues.map((value) => getSyntheticsFilterKeyForLabel(value, field))
          )
        : undefined;
    },
    []
  );

  const serializeStateValues = useCallback(
    (state: FilterStateWithQuery) => {
      return filterFieldsWithQuery.reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: serializeFilterValue(
            cur as SyntheticsMonitorFilterField,
            state[cur as SyntheticsMonitorFilterField]
          ),
        }),
        {}
      );
    },
    [filterFieldsWithQuery, serializeFilterValue]
  );

  const handleFilterChange: SyntheticsMonitorFilterChangeHandler = useCallback(
    (field: SyntheticsMonitorFilterField, selectedValues: string[] | undefined) => {
      // Update url to reflect the changed filter
      updateUrlParams({
        [field]: serializeFilterValue(field, selectedValues),
      });
    },
    [serializeFilterValue, updateUrlParams]
  );

  const reduxState = useSelector(selectMonitorFiltersAndQueryState);
  const reduxStateSnapshot = JSON.stringify(serializeStateValues(reduxState));
  const urlState = filterFieldsWithQuery.reduce(
    (acc, cur) => ({ ...acc, [cur]: urlParams[cur as keyof SyntheticsUrlParams] }),
    {}
  );
  const urlStateSerializedSnapshot = JSON.stringify(serializeStateValues(urlState));

  const isUrlHydratedFromRedux = useRef(false);
  useEffect(() => {
    if (urlStateSerializedSnapshot !== reduxStateSnapshot) {
      if (
        urlStateSerializedSnapshot === '{}' &&
        reduxStateSnapshot !== '{}' &&
        !isUrlHydratedFromRedux.current
      ) {
        // Hydrate url only during initialization
        updateUrlParams(serializeStateValues(reduxState));
      } else {
        dispatch(updateManagementPageStateAction(urlState));
        dispatch(setOverviewPageStateAction(urlState));
      }
    }
    isUrlHydratedFromRedux.current = true;

    // Only depend on the serialized snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStateSerializedSnapshot, reduxStateSnapshot]);

  return { handleFilterChange, filterState: reduxState };
}
