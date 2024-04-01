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
} from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { css } from '@emotion/react';
import { formatBytes } from '@kbn/formatters';
import {
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
  POOR_QUALITY_MINIMUM_PERCENTAGE,
} from '../../../../common/constants';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { QualityIndicator } from '../../quality_indicator';
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
  defaultMessage: 'Degraded Docs',
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

const degradedDocsDescription = (minimimPercentage: number) =>
  i18n.translate('xpack.datasetQuality.degradedDocsQualityDescription', {
    defaultMessage: 'greater than {minimimPercentage}%',
    values: { minimimPercentage },
  });

const degradedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.degradedDocsColumnTooltip"
    defaultMessage="The percentage of degraded documents —documents with the {ignoredProperty} property— in your dataset. {visualQueue}"
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
      visualQueue: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <QualityIndicator
              quality="poor"
              description={` ${degradedDocsDescription(POOR_QUALITY_MINIMUM_PERCENTAGE)}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator
              quality="degraded"
              description={` ${degradedDocsDescription(DEGRADED_QUALITY_MINIMUM_PERCENTAGE)}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator quality="good" description={' 0%'} />
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
  loadingDegradedStats,
  showFullDatasetNames,
  isActiveDataset,
}: {
  fieldFormats: FieldFormatsStart;
  selectedDataset?: FlyoutDataset;
  loadingDegradedStats: boolean;
  showFullDatasetNames: boolean;
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
            size="m"
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
    {
      name: sizeColumnName,
      field: 'sizeBytes',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => formatBytes(dataStreamStat.sizeBytes || 0),
      width: '100px',
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
      render: (timestamp: number) => {
        if (!isActiveDataset(timestamp)) {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiText size="s">{inactiveDatasetActivityColumnDescription}</EuiText>
              <EuiToolTip position="top" content={inactiveDatasetActivityColumnTooltip}>
                <EuiIcon tabIndex={0} type="iInCircle" size="s" />
              </EuiToolTip>
            </EuiFlexGroup>
          );
        }

        return fieldFormats
          .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
          .convert(timestamp);
      },
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
