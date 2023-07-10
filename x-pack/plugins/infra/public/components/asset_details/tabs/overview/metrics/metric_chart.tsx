/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { CSSProperties, useMemo } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import {
  EuiIcon,
  EuiPanel,
  EuiI18n,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  buildCombinedHostsFilter,
  buildExistsHostsFilter,
} from '../../../../../utils/filters/build';
import { LensWrapper } from '../../../../../common/visualizations/lens/lens_wrapper';
import {
  useLensAttributes,
  type Layer,
  type LayerType,
} from '../../../../../hooks/use_lens_attributes';
import type { FormulaConfig, XYLayerOptions } from '../../../../../common/visualizations';
import type { StringDateRange } from '../../../types';

export interface MetricChartProps extends Pick<TypedLensByValueInput, 'id' | 'overrides'> {
  title: string;
  layers: Array<Layer<XYLayerOptions, FormulaConfig[], LayerType>>;
  dataView?: DataView;
  dateRange: StringDateRange;
  nodeName: string;
}

const MIN_HEIGHT = 250;
const lensStyle: CSSProperties = {
  height: MIN_HEIGHT,
};

export const MetricChart = ({
  id,
  title,
  layers,
  dateRange,
  nodeName,
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
      buildExistsHostsFilter({ field: 'host.name', dataView }),
    ];
  }, [dataView, nodeName]);

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange: dateRange,
        filters,
      }),
    [dateRange, filters, getExtraActions]
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
              <EuiI18n
                token="'xpack.infra.hostsViewPage.errorOnLoadingLensDependencies'"
                default="There was an error trying to load Lens Plugin."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <LensWrapper
          id={`assetDetailsMetricsChart${id}`}
          attributes={attributes}
          style={lensStyle}
          extraActions={extraActions}
          dateRange={dateRange}
          filters={filters}
          overrides={overrides}
          loading={loading}
          disableTriggers
          hasTitle
        />
      )}
    </EuiPanel>
  );
};
