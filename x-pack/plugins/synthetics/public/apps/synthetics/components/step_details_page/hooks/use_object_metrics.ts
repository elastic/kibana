/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { usePreviousObjectMetrics } from './use_prev_object_metrics';
import { MIME_FILTERS, MimeType, MimeTypesMap } from '../common/network_data/types';
import { networkEventsSelector } from '../../../state/network_events/selectors';

export const useObjectMetrics = () => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { mimeData: prevMimeData } = usePreviousObjectMetrics();

  const _networkEvents = useSelector(networkEventsSelector);
  const networkEvents = _networkEvents[checkGroupId ?? '']?.[Number(stepIndex)];

  const objectTypeCounts: Record<string, { value: number; prevValue: number }> = {};
  const objectTypeWeights: Record<string, { value: number; prevValue: number }> = {};

  networkEvents?.events.forEach((event) => {
    if (event.mimeType) {
      const mimeType = MimeTypesMap[event.mimeType] ?? MimeType.Other;

      if (objectTypeCounts[mimeType]) {
        objectTypeCounts[mimeType].value++;
      } else {
        objectTypeCounts[mimeType] = { value: 1, prevValue: 0 };
      }

      if (objectTypeWeights[mimeType]) {
        objectTypeWeights[mimeType].value += event.transferSize || 0;
      } else {
        objectTypeWeights[mimeType] = {
          value: event.transferSize || 0,
          prevValue: 0,
        };
      }
    }
  });

  const totalObjects = Object.values(objectTypeCounts).reduce((acc, val) => acc + val.value, 0);

  const totalObjectsWeight = Object.values(objectTypeWeights).reduce(
    (acc, val) => acc + val.value,
    0
  );

  Object.keys(prevMimeData).forEach((mimeType) => {
    const mimeTypeKey = MimeTypesMap[mimeType] ?? MimeType.Other;
    if (objectTypeCounts[mimeTypeKey]) {
      objectTypeCounts[mimeTypeKey].prevValue += prevMimeData[mimeType].count;
    }

    if (objectTypeWeights[mimeTypeKey]) {
      objectTypeWeights[mimeTypeKey].prevValue += prevMimeData[mimeType].weight;
    }
  });

  return {
    loading: networkEvents?.loading ?? true,
    totalObjects,
    totalObjectsWeight: formatBytes(totalObjectsWeight),
    items: MIME_FILTERS.map(({ label, mimeType }) => ({
      label,
      mimeType,
      total: totalObjects,
      count: objectTypeCounts?.[mimeType]?.value ?? 0,
      percent: ((objectTypeCounts?.[mimeType]?.value ?? 0) / totalObjects) * 100,
      weight: formatBytes(objectTypeWeights[mimeType]?.value ?? 0),
      weightPercent: ((objectTypeWeights[mimeType]?.value ?? 0) / totalObjectsWeight) * 100,

      countDelta: getDeltaPercent(
        objectTypeCounts?.[mimeType]?.value ?? 0,
        objectTypeCounts?.[mimeType]?.prevValue ?? 0
      ),
      weightDelta: getWeightDeltaPercent(
        objectTypeWeights?.[mimeType]?.value,
        objectTypeWeights?.[mimeType]?.prevValue
      ),
    })),
  };
};

export const getWeightDeltaPercent = (current: number, previous: number) => {
  if (previous === 0 || !previous) {
    return 0;
  }

  return (((current - previous) / previous) * 100).toFixed(0);
};

export const getDeltaPercent = (current: number, previous: number) => {
  if (previous === 0) {
    return 0;
  }

  return (((current - previous) / previous) * 100).toFixed(0);
};

export const formatBytes = (bytes: number, decimals = 0) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
