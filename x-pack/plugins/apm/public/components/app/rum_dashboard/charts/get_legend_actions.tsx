/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
  EuiContextMenu,
} from '@elastic/eui';
import {
  LegendAction,
  XYChartSeriesIdentifier,
  SeriesName,
  useLegendAction,
} from '@elastic/charts';
import { ClickTriggerEvent } from 'src/plugins/charts/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';

export const getLegendActions = (
  canFilter: (data: ClickTriggerEvent | null) => Promise<boolean>,
  getFilterEventData: (
    series: XYChartSeriesIdentifier
  ) => ClickTriggerEvent | null,
  onFilter: (data: ClickTriggerEvent, negate?: any) => void,
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName
): LegendAction => {
  return ({ series: [xySeries] }) => {
    const { uxUiFilters } = useLegacyUrlParams();
    const { serviceName } = uxUiFilters;
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [ref, onClose] = useLegendAction<HTMLDivElement>();
    const { plugins } = useApmPluginContext();
    const locator = plugins.share.url.locators.get(
      'uptime-add-monitor-locator'
    );

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'main',
        items: [
          {
            name: i18n.translate(
              'xpack.apm.rum.vistorBreakdown.syntheticMonitor',
              {
                defaultMessage: `Create synthetic monitor for {profile}`,
                values: {
                  profile: xySeries.key,
                },
              }
            ),
            'data-test-subj': `legend-${xySeries.key}-synthetics`,
            icon: <EuiIcon type="plusInCircle" size="m" />, // set to Uptime icon
            onClick: () => {
              locator.navigate({
                deviceType: xySeries.key,
                serviceName,
                monitorType: 'browser',
              });
            },
          },
          {
            name: i18n.translate(
              'visTypeXy.legend.filterOutValueButtonAriaLabel',
              {
                defaultMessage: 'Filter out value',
              }
            ),
            'data-test-subj': `legend-${'boop'}-filterOut`,
            icon: <EuiIcon type="minusInCircle" size="m" />,
            onClick: () => {
              setPopoverOpen(false);
            },
          },
        ],
      },
    ];

    const Button = (
      <div
        tabIndex={0}
        ref={ref}
        role="button"
        aria-pressed="false"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          marginLeft: 4,
          marginRight: 4,
        }}
        data-test-subj={`legend-${'boop'}`}
        onKeyPress={() => setPopoverOpen(!popoverOpen)}
        onClick={() => setPopoverOpen(!popoverOpen)}
      >
        <EuiIcon size="s" type="boxesVertical" />
      </div>
    );

    return (
      <EuiPopover
        id="contextMenuNormal"
        button={Button}
        isOpen={popoverOpen}
        closePopover={() => {
          setPopoverOpen(false);
          onClose();
        }}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        title={i18n.translate('visTypeXy.legend.filterOptionsLegend', {
          defaultMessage: '{legendDataLabel}, filter options',
          values: { legendDataLabel: 'boop' },
        })}
      >
        <EuiContextMenu initialPanelId="main" panels={panels} />
      </EuiPopover>
    );
  };
};
