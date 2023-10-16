/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import { DataStream } from '../../../common';

export const isFleetManaged = (dataStream: DataStream): boolean => {
  // TODO check if the wording will change to 'fleet'
  return Boolean(dataStream._meta?.managed && dataStream._meta?.managed_by === 'ingest-manager');
};

export const filterDataStreams = (
  dataStreams: DataStream[],
  visibleTypes: string[]
): DataStream[] => {
  return dataStreams.filter((dataStream: DataStream) => {
    // include all data streams that are neither hidden nor managed
    if (!dataStream.hidden && !isFleetManaged(dataStream)) {
      return true;
    }
    if (dataStream.hidden && visibleTypes.includes('hidden')) {
      return true;
    }
    return isFleetManaged(dataStream) && visibleTypes.includes('managed');
  });
};

export const isSelectedDataStreamHidden = (
  dataStreams: DataStream[],
  selectedDataStreamName?: string
): boolean => {
  return (
    !!selectedDataStreamName &&
    !!dataStreams.find((dataStream: DataStream) => dataStream.name === selectedDataStreamName)
      ?.hidden
  );
};

export const getLifecycleValue = (
  lifecycle?: DataStream['lifecycle'],
  inifniteAsIcon?: boolean
) => {
  if (!lifecycle?.enabled) {
    return i18n.translate('xpack.idxMgmt.dataStreamList.dataRetentionDisabled', {
      defaultMessage: 'Disabled',
    });
  } else if (!lifecycle?.data_retention) {
    const infiniteDataRetention = i18n.translate(
      'xpack.idxMgmt.dataStreamList.dataRetentionInfinite',
      {
        defaultMessage: 'Keep data indefinitely',
      }
    );

    if (inifniteAsIcon) {
      return (
        <EuiToolTip
          data-test-subj="infiniteRetention"
          position="top"
          content={infiniteDataRetention}
        >
          <EuiIcon type="infinity" />
        </EuiToolTip>
      );
    }

    return infiniteDataRetention;
  }

  return lifecycle?.data_retention;
};

export const isDataStreamUnmanaged = (
  nextGenerationManagedBy?: DataStream['nextGenerationManagedBy']
) => {
  return nextGenerationManagedBy === 'Unmanaged';
};
