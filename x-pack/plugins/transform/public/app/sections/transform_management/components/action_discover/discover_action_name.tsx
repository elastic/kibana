/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common/constants';

import { getTransformProgress, TransformListRow } from '../../../../common';

export const discoverActionNameText = i18n.translate(
  'xpack.transform.transformList.discoverActionNameText',
  {
    defaultMessage: 'View in Discover',
  }
);

export const isDiscoverActionDisabled = (
  items: TransformListRow[],
  forceDisable: boolean,
  dataViewExists: boolean
) => {
  if (items.length !== 1) {
    return true;
  }

  const item = items[0];

  // Disable discover action if it's a batch transform and was never started
  const stoppedTransform = item.stats.state === TRANSFORM_STATE.STOPPED;
  const transformProgress = getTransformProgress(item);
  const isBatchTransform = typeof item.config.sync === 'undefined';
  const transformNeverStarted =
    stoppedTransform === true && transformProgress === undefined && isBatchTransform === true;

  return forceDisable === true || dataViewExists === false || transformNeverStarted === true;
};

export interface DiscoverActionNameProps {
  dataViewExists: boolean;
  items: TransformListRow[];
}
export const DiscoverActionName: FC<DiscoverActionNameProps> = ({ dataViewExists, items }) => {
  const isBulkAction = items.length > 1;

  const item = items[0];

  // Disable discover action if it's a batch transform and was never started
  const stoppedTransform = item.stats.state === TRANSFORM_STATE.STOPPED;
  const transformProgress = getTransformProgress(item);
  const isBatchTransform = typeof item.config.sync === 'undefined';
  const transformNeverStarted =
    stoppedTransform && transformProgress === undefined && isBatchTransform === true;

  let disabledTransformMessage;
  if (isBulkAction === true) {
    disabledTransformMessage = i18n.translate(
      'xpack.transform.transformList.discoverTransformBulkToolTip',
      {
        defaultMessage: 'Links to Discover are not supported as a bulk action.',
      }
    );
  } else if (!dataViewExists) {
    disabledTransformMessage = i18n.translate(
      'xpack.transform.transformList.discoverTransformNoDataViewToolTip',
      {
        defaultMessage: `A Kibana data view is required for the destination index to be viewable in Discover`,
      }
    );
  } else if (transformNeverStarted) {
    disabledTransformMessage = i18n.translate(
      'xpack.transform.transformList.discoverTransformToolTip',
      {
        defaultMessage: `The transform needs to be started before it's available in Discover.`,
      }
    );
  }

  if (typeof disabledTransformMessage !== 'undefined') {
    return (
      <EuiToolTip position="top" content={disabledTransformMessage}>
        <span data-test-subj="transformDiscoverActionNameText disabled">
          {discoverActionNameText}
        </span>
      </EuiToolTip>
    );
  }

  return (
    <span data-test-subj="transformDiscoverActionNameText enabled">{discoverActionNameText}</span>
  );
};
