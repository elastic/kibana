/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import DateMath from '@elastic/datemath';
import { Capabilities } from 'src/core/public';
import { MetricsExplorerSeries } from '../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { createTSVBLink } from './helpers/create_tsvb_link';
import { getNodeDetailUrl } from '../../pages/link_to/redirect_to_node_detail';
import { SourceConfiguration } from '../../utils/source_configuration';
import { InventoryItemType } from '../../../common/inventory_models/types';
import { usePrefixPathWithBasepath } from '../../hooks/use_prefix_path_with_basepath';

export interface Props {
  options: MetricsExplorerOptions;
  onFilter?: (query: string) => void;
  series: MetricsExplorerSeries;
  source?: SourceConfiguration;
  timeRange: MetricsExplorerTimeOptions;
  uiCapabilities?: Capabilities;
  chartOptions: MetricsExplorerChartOptions;
}

const fieldToNodeType = (
  source: SourceConfiguration,
  field: string
): InventoryItemType | undefined => {
  if (source.fields.host === field) {
    return 'host';
  }
  if (source.fields.pod === field) {
    return 'pod';
  }
  if (source.fields.container === field) {
    return 'container';
  }
};

const dateMathExpressionToEpoch = (dateMathExpression: string, roundUp = false): number => {
  const dateObj = DateMath.parse(dateMathExpression, { roundUp });
  if (!dateObj) throw new Error(`"${dateMathExpression}" is not a valid time string`);
  return dateObj.valueOf();
};

export const createNodeDetailLink = (
  nodeType: InventoryItemType,
  nodeId: string,
  from: string,
  to: string
) => {
  return getNodeDetailUrl({
    nodeType,
    nodeId,
    from: dateMathExpressionToEpoch(from),
    to: dateMathExpressionToEpoch(to, true),
  });
};

export const MetricsExplorerChartContextMenu: React.FC<Props> = ({
  onFilter,
  options,
  series,
  source,
  timeRange,
  uiCapabilities,
  chartOptions,
}: Props) => {
  const urlPrefixer = usePrefixPathWithBasepath();
  const [isPopoverOpen, setPopoverState] = useState(false);
  const supportFiltering = options.groupBy != null && onFilter != null;
  const handleFilter = useCallback(() => {
    // onFilter needs check for Typescript even though it's
    // covered by supportFiltering variable
    if (supportFiltering && onFilter) {
      onFilter(`${options.groupBy}: "${series.id}"`);
    }
    setPopoverState(false);
  }, [supportFiltering, options.groupBy, series.id, onFilter]);

  const tsvbUrl = createTSVBLink(source, options, series, timeRange, chartOptions);

  // Only display the "Add Filter" option if it's supported
  const filterByItem = supportFiltering
    ? [
        {
          name: i18n.translate('xpack.infra.metricsExplorer.filterByLabel', {
            defaultMessage: 'Add filter',
          }),
          icon: 'metricsApp',
          onClick: handleFilter,
          'data-test-subj': 'metricsExplorerAction-AddFilter',
        },
      ]
    : [];

  const nodeType = source && options.groupBy && fieldToNodeType(source, options.groupBy);
  const viewNodeDetail = nodeType
    ? [
        {
          name: i18n.translate('xpack.infra.metricsExplorer.viewNodeDetail', {
            defaultMessage: 'View metrics for {name}',
            values: { name: nodeType },
          }),
          icon: 'metricsApp',
          href: urlPrefixer(
            'metrics',
            createNodeDetailLink(nodeType, series.id, timeRange.from, timeRange.to)
          ),
          'data-test-subj': 'metricsExplorerAction-ViewNodeMetrics',
        },
      ]
    : [];

  const openInVisualize = uiCapabilities?.visualize?.show
    ? [
        {
          name: i18n.translate('xpack.infra.metricsExplorer.openInTSVB', {
            defaultMessage: 'Open in Visualize',
          }),
          href: tsvbUrl,
          icon: 'visualizeApp',
          disabled: options.metrics.length === 0,
          'data-test-subj': 'metricsExplorerAction-OpenInTSVB',
        },
      ]
    : [];

  const itemPanels = [...filterByItem, ...openInVisualize, ...viewNodeDetail];

  // If there are no itemPanels then there is no reason to show the actions button.
  if (itemPanels.length === 0) return null;

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Actions',
      items: itemPanels,
    },
  ];

  const handleClose = () => setPopoverState(false);
  const handleOpen = () => setPopoverState(true);
  const actionAriaLabel = i18n.translate('xpack.infra.metricsExplorer.actionsLabel.aria', {
    defaultMessage: 'Actions for {grouping}',
    values: { grouping: series.id },
  });
  const actionLabel = i18n.translate('xpack.infra.metricsExplorer.actionsLabel.button', {
    defaultMessage: 'Actions',
  });
  const button = (
    <EuiButtonEmpty
      contentProps={{ 'aria-label': actionAriaLabel }}
      onClick={handleOpen}
      size="s"
      iconType="arrowDown"
      iconSide="right"
    >
      {actionLabel}
    </EuiButtonEmpty>
  );
  return (
    <EuiPopover
      closePopover={handleClose}
      id={`${series.id}-popover`}
      button={button}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
