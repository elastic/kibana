/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from 'react-use';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';
import { MonitorFields } from '../../../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../../../common/types/saved_objects';

export const useRecentlyViewedMonitors = () => {
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage('recentlyViewedMonitors', '[]');

  const { monitorId } = useParams<{ monitorId: string }>();

  const { savedObjects } = useKibana().services;

  useEffect(() => {
    if (recentlyViewed) {
      setRecentlyViewed(JSON.stringify([...new Set([monitorId, ...JSON.parse(recentlyViewed)])]));
    } else {
      setRecentlyViewed(JSON.stringify(monitorId ? [monitorId] : []));
    }
  }, [monitorId, recentlyViewed, setRecentlyViewed]);

  const { data } = useFetcher(async () => {
    const monitorsList = JSON.parse(recentlyViewed ?? '[]') as string[];

    const { resolved_objects: monitorObjects } = await savedObjects!.client.bulkResolve(
      monitorsList.map((monId) => ({
        type: syntheticsMonitorType,
        id: monId,
      }))
    );

    const missingMonitors = monitorObjects
      .filter((mon) => mon.saved_object.error?.statusCode === 404)
      .map((mon) => mon.saved_object.id);

    if (missingMonitors.length > 0) {
      setRecentlyViewed(
        JSON.stringify(monitorsList.filter((monId) => !missingMonitors.includes(monId)))
      );
    }

    return monitorObjects
      .filter(
        ({ saved_object: monitor }) => Boolean(monitor.attributes) && monitor.id !== monitorId
      )
      .map(({ saved_object: monitor }) => ({
        key: monitor.id,
        label: (monitor.attributes as MonitorFields).name,
      }));
  }, [monitorId, recentlyViewed]);

  return useMemo(() => {
    if ((data ?? []).length === 0) {
      return [];
    }
    return [
      { key: 'recently_viewed', label: RECENTLY_VIEWED, isGroupLabel: true },
      ...(data ?? []),
    ];
  }, [data]);
};

const RECENTLY_VIEWED = i18n.translate('xpack.synthetics.monitorSummary.recentlyViewed', {
  defaultMessage: 'Recently viewed',
});
