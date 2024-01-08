/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiForm, EuiSpacer, EuiTitle } from '@elastic/eui';

import { DataGridFormRow } from '../data_grid_form_row';
import { DataViewFormRow } from '../data_view_form_row';
import { SearchFilterFormRow } from '../search_filter_form_row';
import { TransformConfigFormRow } from '../transform_config_form_row';
import { TransformConfigPreviewFormRow } from '../transform_config_preview_form_row';
import { TimeRangeFormRow } from '../time_range_form_row';
import { AdvancedRuntimeMappingsSettings } from '../advanced_runtime_mappings_settings';

import { TransformFunctionSelector } from './transform_function_selector';

export const ConfigSectionTitle: FC<{ title: string }> = ({ title }) => (
  <>
    <EuiSpacer size="m" />
    <EuiTitle size="xs">
      <span>{title}</span>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

export const StepDefineForm: FC = () => {
  return (
    <div data-test-subj="transformStepDefineForm">
      <EuiForm>
        <TransformFunctionSelector />
        <ConfigSectionTitle title="Source data" />
        <DataViewFormRow />
        <TimeRangeFormRow />
        <SearchFilterFormRow />

        <EuiSpacer size="s" />
        <AdvancedRuntimeMappingsSettings />
        <EuiSpacer size="s" />

        <DataGridFormRow />
      </EuiForm>

      <ConfigSectionTitle title="Transform configuration" />
      <TransformConfigFormRow />

      <EuiSpacer size="m" />

      <TransformConfigPreviewFormRow />
    </div>
  );
};
