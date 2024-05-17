/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { Story } from '@storybook/react';
import React from 'react';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { IndicatorsFieldSelector } from './field_selector';

const mockIndexPattern: DataView = {
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    } as DataViewField,
    {
      name: 'threat.feed.name',
      type: 'string',
    } as DataViewField,
  ],
} as DataView;

export default {
  component: IndicatorsFieldSelector,
  title: 'IndicatorsFieldSelector',
};

export const Default: Story<void> = () => {
  return (
    <IndicatorsFieldSelector
      indexPattern={mockIndexPattern}
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
    />
  );
};

export const WithDefaultValue: Story<void> = () => {
  return (
    <IndicatorsFieldSelector
      indexPattern={mockIndexPattern}
      valueChange={({ label }: EuiComboBoxOptionOption<string>) =>
        window.alert(`${label} selected`)
      }
      defaultStackByValue={RawIndicatorFieldId.LastSeen}
    />
  );
};

export const NoData: Story<void> = () => {
  return <IndicatorsFieldSelector indexPattern={{ fields: [] } as any} valueChange={() => {}} />;
};
