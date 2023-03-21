/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import React from 'react';
import { FlameGraphInformationWindowSwitch } from '.';
import { FlameGraphComparisonMode, FlameGraphNormalizationMode } from '../../../common/flamegraph';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { PrimaryAndComparisonSearchBar } from '../primary_and_comparison_search_bar';
import { PrimaryProfilingSearchBar } from '../profiling_app_page_template/primary_profiling_search_bar';
import { DifferentialComparisonMode } from './differential_comparison_mode';
import { FlameGraphNormalizationOptions, NormalizationMenu } from './normalization_menu';

interface Props {
  isDifferentialView: boolean;
  comparisonMode: FlameGraphComparisonMode;
  normalizationMode: FlameGraphNormalizationMode;
  normalizationOptions: FlameGraphNormalizationOptions;
  showInformationWindow: boolean;
  onChangeShowInformationWindow: () => void;
}

export function FlameGraphSearchPanel({
  comparisonMode,
  normalizationMode,
  isDifferentialView,
  normalizationOptions,
  showInformationWindow,
  onChangeShowInformationWindow,
}: Props) {
  const { path, query } = useProfilingParams('/flamegraphs/*');
  const routePath = useProfilingRoutePath();
  const profilingRouter = useProfilingRouter();

  function onChangeComparisonMode(nextComparisonMode: FlameGraphComparisonMode) {
    if (!('comparisonRangeFrom' in query)) {
      return;
    }

    profilingRouter.push(routePath, {
      path,
      query: {
        ...query,
        ...(nextComparisonMode === FlameGraphComparisonMode.Absolute
          ? {
              comparisonMode: FlameGraphComparisonMode.Absolute,
              normalizationMode,
            }
          : { comparisonMode: FlameGraphComparisonMode.Relative }),
      },
    });
  }

  function onChangeNormalizationMode(
    nextNormalizationMode: FlameGraphNormalizationMode,
    options: FlameGraphNormalizationOptions
  ) {
    profilingRouter.push(routePath, {
      path: routePath,
      query:
        nextNormalizationMode === FlameGraphNormalizationMode.Scale
          ? {
              ...query,
              baseline: options.baselineScale,
              comparison: options.comparisonScale,
              normalizationMode: nextNormalizationMode,
            }
          : {
              ...query,
              normalizationMode: nextNormalizationMode,
            },
    });
  }
  return (
    <EuiPanel hasShadow={false} color="subdued">
      {isDifferentialView ? <PrimaryAndComparisonSearchBar /> : <PrimaryProfilingSearchBar />}
      <EuiHorizontalRule />
      <EuiFlexGroup direction="row">
        {isDifferentialView && (
          <>
            <DifferentialComparisonMode
              comparisonMode={comparisonMode}
              onChange={onChangeComparisonMode}
            />
            {comparisonMode === FlameGraphComparisonMode.Absolute && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <NormalizationMenu
                      onChange={onChangeNormalizationMode}
                      mode={normalizationMode}
                      options={normalizationOptions}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </>
        )}
        <EuiFlexItem grow style={{ alignItems: 'flex-end' }}>
          <FlameGraphInformationWindowSwitch
            showInformationWindow={showInformationWindow}
            onChange={onChangeShowInformationWindow}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
