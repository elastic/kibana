/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiFlexGroup, EuiLink } from '@elastic/eui';
import React from 'react';
import { _IGNORED } from '../../../../common/es_fields';
import { NavigationSource } from '../../../services/telemetry';
import { useRedirectLink } from '../../../hooks';
import { QualityPercentageIndicator } from '../../quality_indicator';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';

export const DegradedDocsPercentageLink = ({
  isLoading,
  dataStreamStat,
}: {
  isLoading: boolean;
  dataStreamStat: DataStreamStat;
}) => {
  const {
    degradedDocs: { percentage, count },
  } = dataStreamStat;

  const redirectLinkProps = useRedirectLink({
    dataStreamStat,
    query: { language: 'kuery', query: `${_IGNORED}: *` },
    telemetry: {
      page: 'main',
      navigationSource: NavigationSource.Table,
    },
  });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {percentage ? (
          <EuiLink
            data-test-subj="datasetQualityDegradedDocsPercentageLink"
            {...redirectLinkProps.linkProps}
          >
            <QualityPercentageIndicator percentage={percentage} degradedDocsCount={count} />
          </EuiLink>
        ) : (
          <QualityPercentageIndicator percentage={percentage} />
        )}
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
