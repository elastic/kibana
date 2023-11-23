/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { useFormattedTime } from '../../hooks';

const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Dataset Name',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const lastActivityColumnName = i18n.translate('xpack.datasetQuality.lastActivityColumnName', {
  defaultMessage: 'Last Activity',
});

export const getDatasetQualitTableColumns = (): Array<EuiBasicTableColumn<DataStreamStat>> => {
  return [
    {
      name: nameColumnName,
      field: 'title',
      sortable: true,
      render: (title: string, dataStreamStat: DataStreamStat) => {
        const { integration } = dataStreamStat;

        return (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {integration ? (
              <EuiFlexItem grow={false}>
                <PackageIcon
                  packageName={integration.name}
                  version={integration.version!}
                  icons={integration.icons}
                  size="m"
                  tryApi
                />
              </EuiFlexItem>
            ) : (
              '-'
            )}
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
      name: lastActivityColumnName,
      field: 'lastActivity',
      render: (timestamp: number) => {
        const FormattedTimestamp = () => <>{useFormattedTime(timestamp)}</>;

        return <FormattedTimestamp />;
      },
      sortable: true,
    },
  ];
};
