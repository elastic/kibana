/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { MIME_FILTERS, MimeType, MimeTypesMap } from '../common/network_data/types';
import { networkEventsSelector } from '../../../state/network_events/selectors';

export const useObjectMetrics = () => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const _networkEvents = useSelector(networkEventsSelector);
  const networkEvents = _networkEvents[checkGroupId ?? '']?.[Number(stepIndex)];

  const objectTypeCounts: Record<string, number> = {};
  const objectTypeWeights: Record<string, number> = {};

  networkEvents?.events.forEach((event) => {
    if (event.mimeType) {
      objectTypeCounts[MimeTypesMap[event.mimeType] ?? MimeType.Other] =
        (objectTypeCounts[MimeTypesMap[event.mimeType] ?? MimeType.Other] ?? 0) + 1;
      objectTypeWeights[MimeTypesMap[event.mimeType] ?? MimeType.Other] =
        (objectTypeWeights[MimeTypesMap[event.mimeType] ?? MimeType.Other] ?? 0) +
        (event.transferSize || 0);
    }
  });

  const totalObjects = Object.values(objectTypeCounts).reduce((acc, val) => acc + val, 0);

  const totalObjectsWeight = Object.values(objectTypeWeights).reduce((acc, val) => acc + val, 0);

  return {
    loading: networkEvents?.loading ?? true,
    totalObjects,
    totalObjectsWeight: formatBytes(totalObjectsWeight),
    items: MIME_FILTERS.map(({ label, mimeType }) => ({
      label,
      count: objectTypeCounts[mimeType] ?? 0,
      total: totalObjects,
      mimeType,
      percent: ((objectTypeCounts[mimeType] ?? 0) / totalObjects) * 100,
      weight: formatBytes(objectTypeWeights[mimeType] ?? 0),
      weightPercent: ((objectTypeWeights[mimeType] ?? 0) / totalObjectsWeight) * 100,
    })),
  };
};

export const formatBytes = (bytes: number, decimals = 0) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
