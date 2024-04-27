/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { QualityIndicator } from '.';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';

export const DatasetQualityIndicator = ({
  isLoading,
  dataStreamStat,
}: {
  isLoading: boolean;
  dataStreamStat: DataStreamStat;
}) => {
  const {
    degradedDocs: { quality },
  } = dataStreamStat;

  const translatedQuality = i18n.translate('xpack.datasetQuality.datasetQualityIdicator', {
    defaultMessage: '{quality}',
    values: { quality: capitalize(quality) },
  });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityIndicator quality={quality} description={translatedQuality} isColoredDescription />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
