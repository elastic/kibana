/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTableColumn,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
  POOR_QUALITY_MINIMUM_PERCENTAGE,
} from '../../../common/constants';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import loggingIcon from '../../icons/logging.svg';
import { QualityIndicator, QualityPercentageIndicator } from '../quality_indicator';

const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Dataset Name',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const malformedDocsColumnName = i18n.translate('xpack.datasetQuality.malformedDocsColumnName', {
  defaultMessage: 'Malformed Docs',
});

const malformedDocsDescription = (minimimPercentage: number) =>
  i18n.translate('xpack.datasetQuality.malformedDocsQualityDescription', {
    defaultMessage: 'greater than {minimimPercentage}%',
    values: { minimimPercentage },
  });

const malformedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.malformedDocsColumnTooltip"
    defaultMessage="The percentage of malformed documents -documents with the {ignoredProperty} property- in your dataset. {visualQueue}"
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
      visualQueue: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText>
              <QualityIndicator quality="poor" />
              {` ${malformedDocsDescription(POOR_QUALITY_MINIMUM_PERCENTAGE)}`}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <QualityIndicator quality="degraded" />
              {` ${malformedDocsDescription(DEGRADED_QUALITY_MINIMUM_PERCENTAGE)}`}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <QualityIndicator quality="good" />
              {' 0%'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }}
  />
);

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
      name: (
        <EuiToolTip content={malformedDocsColumnTooltip}>
          <span>
            {`${malformedDocsColumnName} `}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
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
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <QualityPercentageIndicator percentage={dataStreamStat.malformedDocs} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{`${dataStreamStat.malformedDocs}%`}</EuiFlexItem>
          </EuiFlexGroup>
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
