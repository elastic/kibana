/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import {
  DataView,
  DataViewSpec,
  DataViewsServicePublicMethods,
} from '@kbn/data-views-plugin/common';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { IndexPatternField, IndexPatternFieldProps } from './index_pattern_field';

export default {
  title: 'infra/alerting/IndexPatternField',
  decorators: [
    (wrappedStory) => <div style={{ width: 550 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'changed' },
    onDataViewChange: { action: 'dataView changed' },
  },
} as Meta;

const IndexPatternFieldTemplate: Story<IndexPatternFieldProps> = (args) => {
  const dataViewsService = {
    create: (obj: DataViewSpec) => {
      if (obj.title !== 'metrics-*') {
        throw new Error(`Unable to find index patterns with "${obj.title}"`);
      }
      return Promise.resolve({
        ...obj,
        matchedIndices: obj.title === 'metrics-*' ? ['metrics-fake-hosts'] : [],
      } as unknown as DataView);
    },
  } as DataViewsServicePublicMethods;
  return <IndexPatternField {...args} dataViewsService={dataViewsService} />;
};

export const IndexPatternFieldDefault = IndexPatternFieldTemplate.bind({});

IndexPatternFieldDefault.args = {
  label: 'Index pattern override',
  helpText: 'Use this field to override the index pattern (use "metrics-*"). ',
};
