/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';

import { ConfigKey } from '../../../../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../../../../common/types/saved_objects';
import { useGetUrlParams } from '../../../../hooks';

import { SyntheticsFilterField, getMonitorFilterFields } from './filter_fields';

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
  SyntheticsFilterField,
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

export function useGetMonitorEmbeddedFilters() {
  const urlParams = useGetUrlParams();
  const filterFields = getMonitorFilterFields();

  const embeddableReportDefinitions: Record<string, string[]> = {};
  if (urlParams.locations?.length) {
    embeddableReportDefinitions['observer.geo.name'] = (
      Array.isArray(urlParams.locations) ? urlParams.locations : [urlParams.locations]
    ) as string[];
  }

  const embeddableFilters = [];
  for (const filterField of filterFields) {
    if (urlParams[filterField]?.length) {
      const values: string[] = (
        Array.isArray(urlParams[filterField]) ? urlParams[filterField] : [urlParams[filterField]]
      ) as string[];
      switch (filterField) {
        case 'monitorTypes':
          embeddableFilters.push({ field: 'monitor.type', values });
          break;
        case 'tags':
          embeddableFilters.push({ field: 'tags', values });
          break;
        case 'projects':
          embeddableFilters.push({ field: 'monitor.project.id', values });
          break;
      }
    }
  }

  return { embeddableReportDefinitions, embeddableFilters };
}
