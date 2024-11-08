/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { useGetUrlParams } from '../../../hooks';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';

export const useMonitorFilters = ({ forAlerts }: { forAlerts?: boolean }): UrlFilter[] => {
  const { space } = useKibanaSpace();
  const { locations, monitorTypes, tags, projects } = useGetUrlParams();

  return [
    ...(projects?.length ? [{ field: 'monitor.project.id', values: getValues(projects) }] : []),
    ...(monitorTypes?.length ? [{ field: 'monitor.type', values: getValues(monitorTypes) }] : []),
    ...(tags?.length ? [{ field: 'tags', values: getValues(tags) }] : []),
    ...(locations?.length ? [{ field: 'observer.geo.name', values: getValues(locations) }] : []),
    ...(space
      ? [{ field: forAlerts ? 'kibana.space_ids' : 'meta.space_id', values: [space.id] }]
      : []),
  ];
};

const getValues = (values: string | string[]): string[] => {
  return Array.isArray(values) ? values : [values];
};
