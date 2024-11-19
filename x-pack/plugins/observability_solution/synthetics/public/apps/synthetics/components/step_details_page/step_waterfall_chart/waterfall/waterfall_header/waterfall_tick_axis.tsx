/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { BarStyleAccessor, DomainRange, TickFormatter } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';

import { MAIN_GROW_SIZE, SIDEBAR_GROW_SIZE } from '../constants';
import { WaterfallChartSidebarWrapper, WaterfallChartTimeTicksContainer } from '../styles';
import { WaterfallChartFixedAxis } from '../waterfall_chart_fixed_axis';

interface Props {
  showOnlyHighlightedNetworkRequests: boolean;
  setOnlyHighlighted: (val: boolean) => void;
  highlightedNetworkRequests: number;
  fetchedNetworkRequests: number;
  shouldRenderSidebar: boolean;
  barStyleAccessor: BarStyleAccessor;
  domain: DomainRange;
  tickFormat: TickFormatter;
}

export const WaterfallTickAxis = ({
  showOnlyHighlightedNetworkRequests,
  setOnlyHighlighted,
  highlightedNetworkRequests,
  fetchedNetworkRequests,
  shouldRenderSidebar,
  barStyleAccessor,
  domain,
  tickFormat,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <WaterfallChartTimeTicksContainer>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {shouldRenderSidebar && (
              <WaterfallChartSidebarWrapper grow={SIDEBAR_GROW_SIZE}>
                {highlightedNetworkRequests < fetchedNetworkRequests ? (
                  <>
                    <EuiFlexGroup
                      role="button"
                      gutterSize="s"
                      alignItems="center"
                      data-test-subj="syntheticsWaterfallHideNonMatching"
                      aria-pressed={showOnlyHighlightedNetworkRequests}
                      title={FILTER_COLLAPSE_REQUESTS_LABEL}
                      aria-label={FILTER_COLLAPSE_REQUESTS_LABEL}
                      css={{
                        marginTop: euiTheme.size.s,
                        marginLeft: euiTheme.size.m,
                        marginBottom: euiTheme.size.s,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        color: euiTheme.colors.primaryText,
                      }}
                      onClick={() => {
                        setOnlyHighlighted(!showOnlyHighlightedNetworkRequests);
                      }}
                    >
                      <EuiIcon
                        type={showOnlyHighlightedNetworkRequests ? 'eyeClosed' : 'eye'}
                        size="s"
                      />
                      <EuiText size="xs">
                        <FormattedMessage
                          id="xpack.synthetics.waterfall.networkRequests.filteredOut"
                          defaultMessage="Filtered out"
                        />
                      </EuiText>
                    </EuiFlexGroup>
                  </>
                ) : null}
              </WaterfallChartSidebarWrapper>
            )}
            <EuiFlexItem
              css={{ outline: 0, marginLeft: '-16px', height: 40 }}
              grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}
              data-test-subj="axisOnlyWrapper"
            >
              <WaterfallChartFixedAxis
                domain={domain}
                barStyleAccessor={barStyleAccessor}
                tickFormat={tickFormat}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WaterfallChartTimeTicksContainer>
  );
};

const FILTER_COLLAPSE_REQUESTS_LABEL = i18n.translate(
  'xpack.synthetics.pingList.synthetics.waterfall.filters.collapseRequestsLabel',
  {
    defaultMessage: 'Collapse to only show matching requests',
  }
);
