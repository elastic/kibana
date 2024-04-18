/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridColumn, EuiDataGridColumnCellAction } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TopNComparisonFunctionSortField, TopNFunctionSortField } from '@kbn/profiling-utils';
import React from 'react';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { LabelWithHint } from '../label_with_hint';

export const getColumns = (
  compareFrameAction: EuiDataGridColumnCellAction
): EuiDataGridColumn[] => [
  {
    id: TopNFunctionSortField.Rank,
    actions: { showHide: false },
    displayAsText: 'Rank',
    initialWidth: 65,
    schema: 'numeric',
  },
  {
    id: TopNFunctionSortField.Frame,
    actions: { showHide: false },
    displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
      defaultMessage: 'Function',
    }),
    cellActions: [compareFrameAction],
  },
  {
    id: TopNFunctionSortField.Samples,
    initialWidth: 120,
    schema: 'numeric',
    actions: { showHide: false },
    display: (
      <LabelWithHint
        label={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
          defaultMessage: 'Samples',
        })}
        hint={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
          defaultMessage: 'Estimated values',
        })}
        labelSize="s"
        labelStyle={{ fontWeight: 700 }}
        iconSize="s"
      />
    ),
  },
  {
    id: TopNFunctionSortField.SelfCPU,
    actions: { showHide: false },
    schema: 'numeric',
    initialWidth: 120,
    display: (
      <CPULabelWithHint type="self" labelSize="s" labelStyle={{ fontWeight: 700 }} iconSize="s" />
    ),
  },
  {
    id: TopNFunctionSortField.TotalCPU,
    actions: { showHide: false },
    schema: 'numeric',
    initialWidth: 120,
    display: (
      <CPULabelWithHint type="total" labelSize="s" labelStyle={{ fontWeight: 700 }} iconSize="s" />
    ),
  },
  {
    id: TopNComparisonFunctionSortField.ComparisonRank,
    actions: { showHide: false },
    schema: 'numeric',
    displayAsText: 'Rank',
    initialWidth: 69,
    displayHeaderCellProps: { className: 'thickBorderLeft' },
  },
  {
    id: TopNComparisonFunctionSortField.ComparisonFrame,
    actions: { showHide: false },
    displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
      defaultMessage: 'Function',
    }),
    cellActions: [compareFrameAction],
  },
  {
    id: TopNComparisonFunctionSortField.ComparisonSamples,
    actions: { showHide: false },
    schema: 'numeric',
    initialWidth: 120,
    display: (
      <LabelWithHint
        label={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
          defaultMessage: 'Samples',
        })}
        hint={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
          defaultMessage: 'Estimated values',
        })}
        labelSize="s"
        labelStyle={{ fontWeight: 700 }}
        iconSize="s"
      />
    ),
  },
  {
    id: TopNComparisonFunctionSortField.ComparisonSelfCPU,
    actions: { showHide: false },
    schema: 'numeric',
    initialWidth: 120,
    display: (
      <CPULabelWithHint type="self" labelSize="s" labelStyle={{ fontWeight: 700 }} iconSize="s" />
    ),
  },
  {
    id: TopNComparisonFunctionSortField.ComparisonTotalCPU,
    actions: { showHide: false },
    schema: 'numeric',
    initialWidth: 120,
    display: (
      <CPULabelWithHint type="total" labelSize="s" labelStyle={{ fontWeight: 700 }} iconSize="s" />
    ),
  },
  {
    displayAsText: 'Diff',
    actions: { showHide: false },
    id: TopNComparisonFunctionSortField.ComparisonDiff,
    initialWidth: 70,
    isSortable: false,
  },
];
