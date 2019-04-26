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
  onFilter: (query: string) => void;
  series: MetricsExplorerSeries;
  source: SourceQuery.Query['source']['configuration'] | undefined;
}

export const MetricsExplorerChartContextMenu = injectI18n(
  ({ intl, onFilter, options, series, source }: Props) => {
    const [isPopoverOpen, setPopoverState] = useState(false);
    const handleFilter = useCallback(
      () => {
        if (options.groupBy) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
        setPopoverState(false);
      },
      [options, series.id, onFilter]
    );

    const tsvbUrl = createTSVBLink(source, options, series);

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: [
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.filterByLabel',
              defaultMessage: 'Add Filter',
            }),
            onClick: handleFilter,
          },
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.openInTSVB',
              defaultMessage: 'Open in Visualize',
            }),
            href: tsvbUrl,
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
