/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFacetButton,
  EuiBetaBadge,
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { coverageOverviewLegendWidth, coverageOverviewPaletteColors } from '../constants';
import * as i18n from '../translations';

const LegendLabel = ({ label, color }: { label: string; color?: string }) => (
  <EuiFacetButton
    size="xs"
    element="span"
    css={{ padding: 0 }}
    icon={
      <EuiBetaBadge
        css={{ background: color, boxShadow: color != null ? 'none' : undefined }}
        label={label}
        iconType="empty"
        size="s"
      />
    }
  >
    {label}
  </EuiFacetButton>
);

export const CoverageOverviewLegend = () => (
  <EuiPanel css={{ maxWidth: `${coverageOverviewLegendWidth}px` }} hasBorder>
    <EuiFlexGroup gutterSize="xs">
      <EuiText size="s">
        <h4>{i18n.CoverageOverviewLegendTitle}</h4>
      </EuiText>
      <EuiText size="s">
        <small>{i18n.CoverageOverviewLegendSubtitle}</small>
      </EuiText>
    </EuiFlexGroup>

    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="xs" wrap>
      <LegendLabel
        label={`\u003E10 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPaletteColors[3]}
      />

      <LegendLabel
        label={`7-10 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPaletteColors[2]}
      />

      <LegendLabel
        label={`3-6 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPaletteColors[1]}
      />

      <LegendLabel
        label={`1-2 ${i18n.CoverageOverviewLegendRulesLabel}`}
        color={coverageOverviewPaletteColors[0]}
      />

      <LegendLabel label={`0 ${i18n.CoverageOverviewLegendRulesLabel}`} />
    </EuiFlexGroup>
  </EuiPanel>
);
