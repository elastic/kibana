/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { EuiIcon, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { LensWrapper } from '../../../../lens/lens_wrapper';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useLensAttributes, type Layer } from '../../../../../hooks/use_lens_attributes';
import type { FormulaConfig, XYLayerOptions } from '../../../../../common/visualizations';

export interface MetricChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides'> {
  title: string;
  layers: Array<Layer<XYLayerOptions, FormulaConfig[]>>;
  dataView?: DataView;
  timeRange: TimeRange;
  nodeName: string;
}

const MIN_HEIGHT = 250;

export const MetricChart = ({
  id,
  title,
  layers,
  nodeName,
  timeRange,
  dataView,
  overrides,
}: MetricChartProps) => {
  const { euiTheme } = useEuiTheme();

  const { attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    layers,
    title,
    visualizationType: 'lnsXY',
  });

  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: 'host.name',
        values: [nodeName],
        dataView,
      }),
    ];
  }, [dataView, nodeName]);

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange,
        filters,
      }),
    [timeRange, filters, getExtraActions]
  );

  const loading = !attributes;

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      css={css`
        min-height: calc(${MIN_HEIGHT}px + ${euiTheme.size.l});
        position: relative;
      `}
      data-test-subj={`assetDetailsMetricsChart${id}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ minHeight: '100%', alignContent: 'center' }}
          gutterSize="xs"
          justifyContent="center"
          alignItems="center"
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="center">
              <FormattedMessage
                id="xpack.infra.hostsViewPage.errorOnLoadingLensDependencies"
                defaultMessage="There was an error trying to load Lens Plugin."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <LensWrapper
          id={`assetDetailsMetricsChart${id}`}
          attributes={attributes}
          style={{ height: MIN_HEIGHT }}
          extraActions={extraActions}
          dateRange={timeRange}
          filters={filters}
          overrides={overrides}
          loading={loading}
          disableTriggers
        />
      )}
    </EuiPanel>
  );
};
