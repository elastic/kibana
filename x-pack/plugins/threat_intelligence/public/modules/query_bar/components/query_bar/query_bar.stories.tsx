/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ComponentStory } from '@storybook/react';
import { KibanaContextProvider } from '../../../../hooks/use_kibana';
import { QueryBar } from './query_bar';

export default {
  component: QueryBar,
  title: 'QueryBar',
  argTypes: {
    onSubmitQuery: { action: 'onSubmitQuery' },
    onChangedQuery: { action: 'onChangedQuery' },
    onChangedDateRange: { action: 'onChangedDateRange' },
    onSubmitDateRange: { action: 'onSubmitDateRange' },
    onSavedQuery: { action: 'onSavedQuery' },
    onRefresh: { action: 'onRefresh' },
  },
};

const services = {
  data: { query: {} },
  storage: new Storage(localStorage),
  uiSettings: { get: () => {} },
};

const Template: ComponentStory<typeof QueryBar> = (args) => (
  <IntlProvider>
    <KibanaContextProvider services={services}>
      <QueryBar {...args} />{' '}
    </KibanaContextProvider>
  </IntlProvider>
);

export const Basic = Template.bind({});

Basic.args = {
  indexPattern: {} as any,
  filterManager: {} as any,
  filters: [],
  filterQuery: { language: 'kuery', query: '' },
};
