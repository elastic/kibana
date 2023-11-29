/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { IntegrationIcon } from '../common';
import { useLinkToLogExplorer } from '../../hooks';

const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Dataset Name',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const lastActivityColumnName = i18n.translate('xpack.datasetQuality.lastActivityColumnName', {
  defaultMessage: 'Last Activity',
});

const actionsColumnName = i18n.translate('xpack.datasetQuality.actionsColumnName', {
  defaultMessage: 'Actions',
});

const openActionName = i18n.translate('xpack.datasetQuality.openActionName', {
  defaultMessage: 'Open',
});

export const getDatasetQualitTableColumns = ({
  fieldFormats,
  setSelectedDatasetName,
}: {
  fieldFormats: FieldFormatsStart;
  setSelectedDatasetName: Dispatch<SetStateAction<string>>;
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
              <IntegrationIcon integration={integration} />
            </EuiFlexItem>
            <EuiLink onClick={() => setSelectedDatasetName(title)}>{title}</EuiLink>
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
      render: (timestamp: number) =>
        fieldFormats
          .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
          .convert(timestamp),
      sortable: true,
    },
    {
      name: actionsColumnName,
      render: (dataStreamStat: DataStreamStat) => (
        <LinkToLogExplorer dataStreamStat={dataStreamStat} />
      ),
      width: '100px',
    },
  ];
};

const LinkToLogExplorer = ({ dataStreamStat }: { dataStreamStat: DataStreamStat }) => {
  const url = useLinkToLogExplorer({ dataStreamStat });
  return <EuiLink href={url}>{openActionName}</EuiLink>;
};
