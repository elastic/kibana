/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TooltipInfo } from '@elastic/charts';
import React from 'react';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';

// Mirrors Elastic Charts' default tooltip color column width (COLOR_STRIP_CHECK_WIDTH).
const COLOR_STRIP_CHECK_WIDTH = 11;

/**
 * Custom tooltip used by the RED metrics charts when anomalies from multiple
 * environments are combined into a single timeseries (the "all environments"
 * view). It reproduces the default Elastic Charts tooltip markup (same wrapper,
 * header, divider and grid table with the color strip) so it looks identical to
 * the standard tooltip, and additionally appends the environment each anomaly
 * belongs to next to its label, e.g. `Major anomaly (production)  150 ms`.
 */
export function AnomalyChartTooltip({
  values,
  header,
  headerFormatter,
  backgroundColor,
}: TooltipInfo & {
  headerFormatter: (value: number) => React.ReactNode;
  backgroundColor?: string;
}) {
  const visibleValues = values.filter((value) => value.isVisible);
  const hasHeader = header != null;

  return (
    <div className="echTooltip" data-testid="echTooltip">
      {hasHeader && <div className="echTooltipHeader">{headerFormatter(header.value)}</div>}
      {hasHeader && visibleValues.length > 0 && <div className="echTooltipDivider" />}
      <div className="echTooltip__tableWrapper">
        <div
          role="table"
          className="echTooltip__table"
          style={{ gridTemplateColumns: `${COLOR_STRIP_CHECK_WIDTH}px auto auto` }}
        >
          <div role="rowgroup" className="echTooltip__tableBody">
            {visibleValues.map((value) => {
              const { color, label, formattedValue, seriesIdentifier, datum } = value;
              const environment = (datum as { environment?: string } | undefined)?.environment;
              const environmentSuffix =
                environment != null ? ` (${getEnvironmentLabel(environment)})` : '';

              return (
                <div role="row" className="echTooltip__tableRow" key={seriesIdentifier.key}>
                  <div role="gridcell" className="echTooltip__tableCell echTooltip__colorCell">
                    <div className="echTooltip__colorStrip--bg" style={{ backgroundColor }} />
                    <div className="echTooltip__colorStrip" style={{ backgroundColor: color }} />
                    <div className="echTooltip__colorStrip--spacer" />
                  </div>
                  <div
                    role="gridcell"
                    className="echTooltip__tableCell"
                    style={{ textAlign: 'left' }}
                  >
                    <span className="echTooltip__label" title={`${label}${environmentSuffix}`}>
                      {label}
                      {environmentSuffix}
                    </span>
                  </div>
                  <div
                    role="gridcell"
                    className="echTooltip__tableCell"
                    style={{ textAlign: 'right' }}
                  >
                    <span className="echTooltip__value" dir="ltr">
                      {formattedValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
