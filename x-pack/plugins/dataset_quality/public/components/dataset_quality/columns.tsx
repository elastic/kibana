/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import loggingIcon from '../../icons/logging.svg';
import { QualityPercentageIndicator } from '../quality_indicator';

const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Dataset Name',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const malformedDocsColumnName = i18n.translate('xpack.datasetQuality.malformedDocsColumnName', {
  defaultMessage: 'Malformed Docs',
});

const lastActivityColumnName = i18n.translate('xpack.datasetQuality.lastActivityColumnName', {
  defaultMessage: 'Last Activity',
});

export const getDatasetQualitTableColumns = ({
  fieldFormats,
  loadingMalformedStats,
}: {
  fieldFormats: FieldFormatsStart;
  loadingMalformedStats?: boolean;
}): Array<EuiBasicTableColumn<DataStreamStat>> => {
  return [
    {
      name: nameColumnName,
      field: 'title',
      sortable: true,
      render: (title: string, dataStreamStat: DataStreamStat) => {
        const { integration } = dataStreamStat;

        return (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              {integration ? (
                <PackageIcon
                  packageName={integration.name}
                  version={integration.version!}
                  icons={integration.icons}
                  size="m"
                  tryApi
                />
              ) : (
                <EuiIcon type={loggingIcon} size="m" />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: sizeColumnName,
      field: 'size',
      sortable: true,
    },
    {
      name: malformedDocsColumnName,
      field: 'malformedDocs',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <EuiSkeletonRectangle
          width="50px"
          height="20px"
          borderRadius="m"
          isLoading={loadingMalformedStats}
          contentAriaLabel="Example description"
        >
          <QualityPercentageIndicator percentage={dataStreamStat.malformedDocs} />
          {`${dataStreamStat.malformedDocs}%`}
        </EuiSkeletonRectangle>
      ),
    },
    {
      name: lastActivityColumnName,
      field: 'lastActivity',
      render: (timestamp: number) =>
        fieldFormats
          .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
          .convert(timestamp),
      sortable: true,
    },
  ];
};
