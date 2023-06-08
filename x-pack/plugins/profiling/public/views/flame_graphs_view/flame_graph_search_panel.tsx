/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { PrimaryAndComparisonSearchBar } from '../../components/primary_and_comparison_search_bar';
import { PrimaryProfilingSearchBar } from '../../components/profiling_app_page_template/primary_profiling_search_bar';
import { DifferentialComparisonMode } from './differential_comparison_mode';
import {
  ComparisonMode,
  NormalizationMode,
  NormalizationOptions,
  NormalizationMenu,
} from '../../components/normalization_menu';

interface Props {
  isDifferentialView: boolean;
  comparisonMode: ComparisonMode;
  normalizationMode: NormalizationMode;
  normalizationOptions: NormalizationOptions;
}

export function FlameGraphSearchPanel({
  comparisonMode,
  normalizationMode,
  isDifferentialView,
  normalizationOptions,
}: Props) {
  const { path, query } = useProfilingParams('/flamegraphs/*');
  const routePath = useProfilingRoutePath();
  const profilingRouter = useProfilingRouter();

  function onChangeComparisonMode(nextComparisonMode: ComparisonMode) {
    if (!('comparisonRangeFrom' in query)) {
      return;
    }

    profilingRouter.push(routePath, {
      path,
      query: {
        ...query,
        ...(nextComparisonMode === ComparisonMode.Absolute
          ? {
              comparisonMode: ComparisonMode.Absolute,
              normalizationMode,
            }
          : { comparisonMode: ComparisonMode.Relative }),
      },
    });
  }

  function onChangeNormalizationMode(
    nextNormalizationMode: NormalizationMode,
    options: NormalizationOptions
  ) {
    profilingRouter.push(routePath, {
      path: routePath,
      query:
        nextNormalizationMode === NormalizationMode.Scale
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
            {comparisonMode === ComparisonMode.Absolute && (
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
      </EuiFlexGroup>
    </EuiPanel>
  );
}
