/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { Capabilities } from '@kbn/core/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import { AlertFlyout } from '../../../../alerting/metric_threshold/components/alert_flyout';
import { MetricsExplorerSeries } from '../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartOptions,
} from '../hooks/use_metrics_explorer_options';
import { createTSVBLink } from './helpers/create_tsvb_link';
import { useNodeDetailsRedirect } from '../../../link_to';
import { HOST_FIELD, POD_FIELD, CONTAINER_FIELD } from '../../../../../common/constants';

export interface Props {
  options: MetricsExplorerOptions;
  onFilter?: (query: string) => void;
  series: MetricsExplorerSeries;
  source?: MetricsSourceConfigurationProperties;
  timeRange: MetricsExplorerTimeOptions;
  uiCapabilities?: Capabilities;
  chartOptions: MetricsExplorerChartOptions;
}

const fieldToNodeType = (
  source: MetricsSourceConfigurationProperties,
  groupBy: string | string[]
): InventoryItemType | undefined => {
  const fields = Array.isArray(groupBy) ? groupBy : [groupBy];
  if (fields.includes(HOST_FIELD)) {
    return 'host';
  }
  if (fields.includes(POD_FIELD)) {
    return 'pod';
  }
  if (fields.includes(CONTAINER_FIELD)) {
    return 'container';
  }
};

const dateMathExpressionToEpoch = (dateMathExpression: string, roundUp = false): number => {
  const dateObj = DateMath.parse(dateMathExpression, { roundUp });
  if (!dateObj) throw new Error(`"${dateMathExpression}" is not a valid time string`);
  return dateObj.valueOf();
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
  const { getNodeDetailUrl } = useNodeDetailsRedirect();
  const [isPopoverOpen, setPopoverState] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const supportFiltering = options.groupBy != null && onFilter != null;
  const handleFilter = useCallback(() => {
    // onFilter needs check for Typescript even though it's
    // covered by supportFiltering variable
    if (supportFiltering && onFilter) {
      if (Array.isArray(options.groupBy)) {
        onFilter(
          options.groupBy.map((field, index) => `${field}: "${series.keys?.[index]}"`).join(' and ')
        );
      } else {
        onFilter(`${options.groupBy}: "${series.id}"`);
      }
    }
    setPopoverState(false);
  }, [supportFiltering, onFilter, options, series.keys, series.id]);

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

  const nodeDetailLinkProps = useLinkProps({
    app: 'metrics',
    ...(nodeType
      ? getNodeDetailUrl({
          assetType: nodeType,
          assetId: series.id,
          search: {
            from: dateMathExpressionToEpoch(timeRange.from),
            to: dateMathExpressionToEpoch(timeRange.to, true),
          },
        })
      : {}),
  });
  const tsvbLinkProps = useLinkProps({
    ...createTSVBLink(source, options, series, timeRange, chartOptions),
  });
  const viewNodeDetail = nodeType
    ? [
        {
          name: i18n.translate('xpack.infra.metricsExplorer.viewNodeDetail', {
            defaultMessage: 'View metrics for {name}',
            values: { name: nodeType },
          }),
          icon: 'metricsApp',
          ...(nodeType ? nodeDetailLinkProps : {}),
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
          ...tsvbLinkProps,
          icon: 'visualizeApp',
          disabled: options.metrics.length === 0,
          'data-test-subj': 'metricsExplorerAction-OpenInTSVB',
        },
      ]
    : [];

  const createAlert = uiCapabilities?.infrastructure?.save
    ? [
        {
          name: i18n.translate('xpack.infra.metricsExplorer.alerts.createRuleButton', {
            defaultMessage: 'Create threshold rule',
          }),
          icon: 'bell',
          onClick() {
            setFlyoutVisible(true);
          },
        },
      ]
    : [];

  const itemPanels = [...filterByItem, ...openInVisualize, ...viewNodeDetail, ...createAlert];

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
  const togglePopover = () => setPopoverState((currentIsOpen) => !currentIsOpen);
  const actionAriaLabel = i18n.translate('xpack.infra.metricsExplorer.actionsLabel.aria', {
    defaultMessage: 'Actions for {grouping}',
    values: { grouping: series.id },
  });
  const actionLabel = i18n.translate('xpack.infra.metricsExplorer.actionsLabel.button', {
    defaultMessage: 'Actions',
  });
  const button = (
    <EuiButtonEmpty
      data-test-subj="infraMetricsExplorerChartContextMenuButton"
      contentProps={{ 'aria-label': actionAriaLabel }}
      onClick={togglePopover}
      size="s"
      iconType="arrowDown"
      iconSide="right"
    >
      {actionLabel}
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        closePopover={handleClose}
        id={`${series.id}-popover`}
        button={button}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
        <AlertFlyout
          series={series}
          options={options}
          setVisible={setFlyoutVisible}
          visible={flyoutVisible}
        />
      </EuiPopover>
    </>
  );
};
