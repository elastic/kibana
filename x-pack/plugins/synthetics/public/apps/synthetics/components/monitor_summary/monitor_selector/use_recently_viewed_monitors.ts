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
      setRecentlyViewed(JSON.stringify([monitorId]));
    }
  }, [monitorId, recentlyViewed, setRecentlyViewed]);

  const { data, loading } = useFetcher(async () => {
    const { resolved_objects: monitorObjects } = await savedObjects!.client.bulkResolve([
      {
        type: syntheticsMonitorType,
        id: monitorId,
      },
      {
        type: syntheticsMonitorType,
        id: 'wwwwww',
      },
    ]);

    return monitorObjects
      .filter(({ saved_object: monitor }) => Boolean(monitor.attributes))
      .map(({ saved_object: monitor }) => ({
        id: monitor.id,
        label: (monitor.attributes as MonitorFields).name,
      }));
  }, [monitorId]);

  return useMemo(() => {
    return [
      { id: 'recently_viewed', label: RECENTLY_VIEWED, isGroupLabel: true },
      ...JSON.parse(recentlyViewed ?? '[]'),
    ];
  }, []);
};

const RECENTLY_VIEWED = i18n.translate('xpack.synthetics.monitorSummary.recentlyViewed', {
  defaultMessage: 'Recently viewed',
});
