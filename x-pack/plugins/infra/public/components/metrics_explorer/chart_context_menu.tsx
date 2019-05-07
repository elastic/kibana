/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { createTSVBLink } from './helpers/create_tsvb_link';
import { SourceQuery } from '../../graphql/types';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onFilter?: (query: string) => void;
  series: MetricsExplorerSeries;
  source: SourceQuery.Query['source']['configuration'] | undefined;
  timeRange: MetricsExplorerTimeOptions;
}

export const MetricsExplorerChartContextMenu = injectI18n(
  ({ intl, onFilter, options, series, source, timeRange }: Props) => {
    const [isPopoverOpen, setPopoverState] = useState(false);
    const supportFiltering = options.groupBy != null && onFilter != null;
    const handleFilter = useCallback(
      () => {
        // onFilter needs check for Typescript even though it's
        // covered by supportFiltering variable
        if (supportFiltering && onFilter) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
        setPopoverState(false);
      },
      [supportFiltering, options.groupBy, series.id, onFilter]
    );

    const tsvbUrl = createTSVBLink(source, options, series, timeRange);

    // Only display the "Add Filter" option if it's supported
    const filterByItem = supportFiltering
      ? [
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.filterByLabel',
              defaultMessage: 'Add Filter',
            }),
            icon: 'infraApp',
            onClick: handleFilter,
          },
        ]
      : [];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Actions',
        items: [
          ...filterByItem,
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.openInTSVB',
              defaultMessage: 'Open in Visualize',
            }),
            href: tsvbUrl,
            icon: 'visualizeApp',
            disabled: options.metrics.length === 0,
          },
        ],
      },
    ];
    const handleClose = () => setPopoverState(false);
    const handleOpen = () => setPopoverState(true);
    const actionAriaLabel = intl.formatMessage(
      {
        id: 'xpack.infra.metricsExplorer.actionsLabel.aria',
        defaultMessage: 'Actions for {grouping}',
      },
      { grouping: series.id }
    );
    const actionLabel = intl.formatMessage({
      id: 'xpack.infra.metricsExplorer.actionsLabel.button',
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
  }
);
