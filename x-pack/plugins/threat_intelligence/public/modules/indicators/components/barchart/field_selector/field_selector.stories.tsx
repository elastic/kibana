/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { RawIndicatorFieldId } from '../../../../../../common/types/indicator';
import { IndicatorsFieldSelector } from '.';

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
      valueChange={(value: string) => window.alert(`${value} selected`)}
    />
  );
};

export const WithDefaultValue: Story<void> = () => {
  return (
    <IndicatorsFieldSelector
      indexPattern={mockIndexPattern}
      valueChange={(value: string) => window.alert(`${value} selected`)}
      defaultStackByValue={RawIndicatorFieldId.LastSeen}
    />
  );
};

export const NoData: Story<void> = () => {
  return <IndicatorsFieldSelector indexPattern={{ fields: [] } as any} valueChange={() => {}} />;
};
