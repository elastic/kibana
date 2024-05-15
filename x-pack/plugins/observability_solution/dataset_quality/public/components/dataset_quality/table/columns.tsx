/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiToolTip,
  EuiButtonIcon,
  EuiText,
  formatNumber,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { css } from '@emotion/react';
import {
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
  POOR_QUALITY_MINIMUM_PERCENTAGE,
  BYTE_NUMBER_FORMAT,
} from '../../../../common/constants';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { DatasetQualityIndicator, QualityIndicator } from '../../quality_indicator';
import { IntegrationIcon } from '../../common';
import { useLinkToLogsExplorer } from '../../../hooks';
import { FlyoutDataset } from '../../../state_machines/dataset_quality_controller';
import { DegradedDocsPercentageLink } from './degraded_docs_percentage_link';

const expandDatasetAriaLabel = i18n.translate('xpack.datasetQuality.expandLabel', {
  defaultMessage: 'Expand',
});
const collapseDatasetAriaLabel = i18n.translate('xpack.datasetQuality.collapseLabel', {
  defaultMessage: 'Collapse',
});
const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Dataset Name',
});

const namespaceColumnName = i18n.translate('xpack.datasetQuality.namespaceColumnName', {
  defaultMessage: 'Namespace',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const degradedDocsColumnName = i18n.translate('xpack.datasetQuality.degradedDocsColumnName', {
  defaultMessage: 'Degraded Docs (%)',
});

const datasetQualityColumnName = i18n.translate('xpack.datasetQuality.datasetQualityColumnName', {
  defaultMessage: 'Dataset Quality',
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

const inactiveDatasetActivityColumnDescription = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetActivityColumnDescription',
  {
    defaultMessage: 'No activity in the selected timeframe',
  }
);

const inactiveDatasetActivityColumnTooltip = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetActivityColumnTooltip',
  {
    defaultMessage: 'Try expanding the time range above for more results',
  }
);

const degradedDocsDescription = (
  quality: string,
  minimimPercentage: number,
  comparator: string = ''
) =>
  i18n.translate('xpack.datasetQuality.degradedDocsQualityDescription', {
    defaultMessage: '{quality} -{comparator} {minimimPercentage}%',
    values: { quality, minimimPercentage, comparator },
  });

const degradedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.degradedDocsColumnTooltip"
    defaultMessage="The percentage of documents with the {ignoredProperty} property in your dataset."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

const datasetQualityColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.datasetQualityColumnTooltip"
    defaultMessage="Quality is based on the percentage of degraded docs in a dataset. {visualQueue}"
    values={{
      visualQueue: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <QualityIndicator
              quality="poor"
              description={` ${degradedDocsDescription(
                'Poor',
                POOR_QUALITY_MINIMUM_PERCENTAGE,
                ' greater than'
              )}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator
              quality="degraded"
              description={` ${degradedDocsDescription(
                'Degraded',
                DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
                ' greater than'
              )}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator
              quality="good"
              description={` ${degradedDocsDescription(
                'Good',
                DEGRADED_QUALITY_MINIMUM_PERCENTAGE
              )}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }}
  />
);

export const getDatasetQualityTableColumns = ({
  fieldFormats,
  selectedDataset,
  openFlyout,
  loadingDataStreamStats,
  loadingDegradedStats,
  showFullDatasetNames,
  isSizeStatsAvailable,
  isActiveDataset,
}: {
  fieldFormats: FieldFormatsStart;
  selectedDataset?: FlyoutDataset;
  loadingDataStreamStats: boolean;
  loadingDegradedStats: boolean;
  showFullDatasetNames: boolean;
  isSizeStatsAvailable: boolean;
  openFlyout: (selectedDataset: FlyoutDataset) => void;
  isActiveDataset: (lastActivity: number) => boolean;
}): Array<EuiBasicTableColumn<DataStreamStat>> => {
  return [
    {
      name: '',
      render: (dataStreamStat: DataStreamStat) => {
        const isExpanded = dataStreamStat.rawName === selectedDataset?.rawName;

        return (
          <EuiButtonIcon
            data-test-subj="datasetQualityExpandButton"
            size="xs"
            color="text"
            onClick={() => openFlyout(dataStreamStat as FlyoutDataset)}
            iconType={isExpanded ? 'minimize' : 'expand'}
            title={!isExpanded ? expandDatasetAriaLabel : collapseDatasetAriaLabel}
            aria-label={!isExpanded ? expandDatasetAriaLabel : collapseDatasetAriaLabel}
          />
        );
      },
      width: '40px',
      css: css`
        &.euiTableCellContent {
          padding: 0;
        }
      `,
    },
    {
      name: nameColumnName,
      field: 'title',
      sortable: true,
      render: (title: string, dataStreamStat: DataStreamStat) => {
        const { integration, name } = dataStreamStat;

        return (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <IntegrationIcon integration={integration} />
            </EuiFlexItem>
            <EuiText size="s">{title}</EuiText>
            {showFullDatasetNames && (
              <EuiText size="xs" color="subdued">
                <em>{name}</em>
              </EuiText>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: namespaceColumnName,
      field: 'namespace',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <EuiBadge color="hollow">{dataStreamStat.namespace}</EuiBadge>
      ),
      width: '160px',
    },
    ...(isSizeStatsAvailable
      ? [
          {
            name: sizeColumnName,
            field: 'sizeBytes',
            sortable: true,
            render: (_: any, dataStreamStat: DataStreamStat) => {
              return (
                <EuiSkeletonRectangle
                  width="60px"
                  height="20px"
                  borderRadius="m"
                  isLoading={loadingDataStreamStats || loadingDegradedStats}
                >
                  {formatNumber(
                    DataStreamStat.calculateFilteredSize(dataStreamStat),
                    BYTE_NUMBER_FORMAT
                  )}
                </EuiSkeletonRectangle>
              );
            },
            width: '100px',
          },
        ]
      : []),
    {
      name: (
        <EuiToolTip content={datasetQualityColumnTooltip}>
          <span>
            {`${datasetQualityColumnName} `}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      field: 'degradedDocs.percentage',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <DatasetQualityIndicator isLoading={loadingDegradedStats} dataStreamStat={dataStreamStat} />
      ),
      width: '140px',
    },
    {
      name: (
        <EuiToolTip content={degradedDocsColumnTooltip}>
          <span>
            {`${degradedDocsColumnName} `}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      field: 'degradedDocs.percentage',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <DegradedDocsPercentageLink
          isLoading={loadingDegradedStats}
          dataStreamStat={dataStreamStat}
        />
      ),
      width: '140px',
    },
    {
      name: lastActivityColumnName,
      field: 'lastActivity',
      render: (timestamp: number) => (
        <EuiSkeletonRectangle
          width="200px"
          height="20px"
          borderRadius="m"
          isLoading={loadingDataStreamStats}
        >
          {!isActiveDataset(timestamp) ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiText size="s">{inactiveDatasetActivityColumnDescription}</EuiText>
              <EuiToolTip position="top" content={inactiveDatasetActivityColumnTooltip}>
                <EuiIcon tabIndex={0} type="iInCircle" size="s" />
              </EuiToolTip>
            </EuiFlexGroup>
          ) : (
            fieldFormats
              .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
              .convert(timestamp)
          )}
        </EuiSkeletonRectangle>
      ),
      width: '300px',
      sortable: true,
    },
    {
      name: actionsColumnName,
      render: (dataStreamStat: DataStreamStat) => (
        <LogsExplorerLink dataStreamStat={dataStreamStat} title={openActionName} />
      ),
      width: '100px',
    },
  ];
};

const LogsExplorerLink = ({
  dataStreamStat,
  title,
}: {
  dataStreamStat: DataStreamStat;
  title: string;
}) => {
  const logsExplorerLinkProps = useLinkToLogsExplorer({ dataStreamStat });

  return (
    <EuiLink data-test-subj="datasetQualityLogsExplorerLinkLink" {...logsExplorerLinkProps}>
      {title}
    </EuiLink>
  );
};
