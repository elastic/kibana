/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiToolTip, type EuiPanelProps } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { useLensAttributes, type UseLensAttributesParams } from '../../hooks/use_lens_attributes';
import type { BaseChartProps } from './types';
import type { TooltipContentProps } from './metric_explanation/tooltip_content';
import { LensWrapper } from './lens_wrapper';
import { ChartLoadError } from './chart_load_error';

const MIN_HEIGHT = 300;

export type LensChartProps = UseLensAttributesParams &
  BaseChartProps &
  Pick<EuiPanelProps, 'borderRadius'> & {
    toolTip?: React.ReactElement<TooltipContentProps>;
    searchSessionId?: string;
    description?: string;
  };

export const LensChart = React.memo(
  ({
    id,
    borderRadius,
    dateRange,
    filters,
    hidePanelTitles,
    lastReloadRequestTime,
    query,
    onBrushEnd,
    onFilter,
    overrides,
    toolTip,
    searchSessionId,
    disableTriggers = false,
    height = MIN_HEIGHT,
    loading = false,
    ...lensAttributesParams
  }: LensChartProps) => {
    const { formula, attributes, getExtraActions, error } = useLensAttributes(lensAttributesParams);

    const isLoading = loading || !attributes;

    const extraActions: Action[] = getExtraActions({
      timeRange: dateRange,
      query,
      filters,
      searchSessionId,
    });

    const lens = (
      <LensWrapper
        id={id}
        attributes={attributes}
        dateRange={dateRange}
        disableTriggers={disableTriggers}
        extraActions={extraActions}
        filters={filters}
        hidePanelTitles={hidePanelTitles}
        loading={isLoading}
        style={{ height }}
        query={query}
        overrides={overrides}
        onBrushEnd={onBrushEnd}
        searchSessionId={searchSessionId}
        onFilter={onFilter}
        handleUserMessages={(messages) => {
          return messages.map((m) => {
            if (
              m.displayLocations.find((d) => d.id === 'embeddableBadge') !== undefined &&
              m.severity === 'error'
              // we need something else to better identify those errors
            ) {
              return {
                ...m,
                severity: 'warning' as const,
                longMessage: (
                  <p>
                    <b>
                      {i18n.translate('xpack.infra.lens.b.noResultsFoundLabel', {
                        defaultMessage: 'No Results found',
                      })}
                    </b>
                    <br />
                    {i18n.translate('xpack.infra.lens.p.youCanShowTheLabel', {
                      defaultMessage:
                        'You can show the cpu by declaring metrics in your system integration',
                    })}
                    <br />
                    <a>
                      {i18n.translate('xpack.infra.lens.a.learnHowLabel', {
                        defaultMessage: 'Learn how',
                      })}
                    </a>
                  </p>
                ),
              };
            }
            return m;
          });
        }}
      />
    );
    const content = !toolTip ? (
      lens
    ) : (
      <EuiToolTip
        delay="regular"
        content={React.cloneElement(toolTip, {
          formula,
        })}
        anchorClassName="eui-fullWidth"
      >
        {/* EuiToolTip forwards some event handlers to the child component.
        Wrapping Lens inside a div prevents that from causing unnecessary re-renders  */}
        <div>{lens}</div>
      </EuiToolTip>
    );

    return (
      <EuiPanel
        hasBorder={!!borderRadius}
        borderRadius={borderRadius}
        hasShadow={false}
        paddingSize={error ? 'm' : 'none'}
        data-test-subj={id}
        css={css`
          position: relative;
          min-height: ${height}px;
          .embPanel-isLoading {
            min-height: ${height}px;
          }
        `}
      >
        {error ? <ChartLoadError error={error} /> : content}
      </EuiPanel>
    );
  }
);
