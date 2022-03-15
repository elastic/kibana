/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiPanel, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { BuilderItem } from '../types';
import { SeriesActions } from './columns/series_actions';
import { SeriesInfo } from './columns/series_info';
import { DataTypesSelect } from './columns/data_type_select';
import { IncompleteBadge } from './columns/incomplete_badge';
import { ExpandedSeriesRow } from './expanded_series_row';
import { SeriesName } from './columns/series_name';
import { ReportMetricOptions } from './report_metric_options';

const StyledAccordion = styled(EuiAccordion)`
  .euiAccordion__button {
    width: auto;
    flex-grow: 0;
  }

  .euiAccordion__optionalAction {
    flex-grow: 1;
    flex-shrink: 1;
  }

  .euiAccordion__childWrapper {
    overflow: visible;
  }
`;

interface Props {
  item: BuilderItem;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export function Series({ item, isExpanded, toggleExpanded }: Props) {
  const { id } = item;
  const seriesProps = {
    ...item,
    seriesId: id,
  };

  const [isExpandedOnce, setIsExpandedOnce] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setIsExpandedOnce(true);
    }
  }, [isExpanded]);

  return (
    <EuiPanel hasBorder={true} data-test-subj={`exploratoryViewSeriesPanel${0}`}>
      <StyledAccordion
        id={`exploratoryViewSeriesAccordion${id}`}
        forceState={isExpanded ? 'open' : 'closed'}
        aria-label={ACCORDION_LABEL}
        onToggle={toggleExpanded}
        arrowDisplay={!seriesProps.series.dataType ? 'none' : undefined}
        extraAction={
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <SeriesInfo {...seriesProps} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SeriesName {...seriesProps} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <DataTypesSelect {...seriesProps} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ReportMetricOptions {...seriesProps} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <IncompleteBadge {...seriesProps} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <SeriesActions
                {...seriesProps}
                onEditClick={!isExpanded ? toggleExpanded : undefined}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel color="subdued">
          {isExpandedOnce && <ExpandedSeriesRow {...seriesProps} />}
        </EuiPanel>
      </StyledAccordion>
    </EuiPanel>
  );
}

export const ACCORDION_LABEL = i18n.translate(
  'xpack.observability.expView.seriesBuilder.accordion.label',
  {
    defaultMessage: 'Toggle series information',
  }
);
