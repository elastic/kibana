/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { createTSVBLink } from './create_tsvb_link';
import { SourceQuery } from '../../graphql/types';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onFilter?: (query: string) => void;
  series: MetricsExplorerSeries;
  source: SourceQuery.Query['source']['configuration'] | undefined;
}

export const MetricsExplorerChartContextMenu = injectI18n(
  ({ intl, onFilter, options, series, source }: Props) => {
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
      [options, series.id, onFilter]
    );

    const tsvbUrl = createTSVBLink(source, options, series);

    // Only display the "Add Filter" option if it's supported
    const filterByItem = supportFiltering
      ? [
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.filterByLabel',
              defaultMessage: 'Add Filter',
            }),
            onClick: handleFilter,
          },
        ]
      : [];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: [
          ...filterByItem,
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.openInTSVB',
              defaultMessage: 'Open in Visualize',
            }),
            href: tsvbUrl,
            disabled: options.metrics.length === 0,
          },
        ],
      },
    ];
    const handleClose = useCallback(() => setPopoverState(false), []);
    const handleOpen = useCallback(() => setPopoverState(true), []);
    const button = (
      <EuiButtonIcon
        aria-label={intl.formatMessage({
          id: 'xpack.infra.metricsExplorer.chartOptions',
          defaultMessage: 'Chart options',
        })}
        color="text"
        iconType="gear"
        onClick={handleOpen}
      />
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
