/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { action } from '@storybook/addon-actions';

import type { Props } from './package_list_grid';
import { PackageListGrid } from './package_list_grid';

export default {
  component: PackageListGrid,
  title: 'Sections/EPM/Package List Grid',
};

type Args = Pick<Props, 'title' | 'isLoading' | 'showMissingIntegrationMessage'>;

const args: Args = {
  title: 'Installed integrations',
  isLoading: false,
  showMissingIntegrationMessage: false,
};
const categories = [
  {
    title: 'Category One',
    id: 'category_one',
    count: 2,
  },
  {
    title: 'Category Two',
    id: 'category_two',
    count: 3,
  },
  {
    title: 'Web',
    id: 'web',
    count: 1,
  },
];

export const EmptyList = (props: Args) => (
  <PackageListGrid
    list={[]}
    searchTerm=""
    setSearchTerm={action('setSearchTerm')}
    setCategory={action('setCategory')}
    categories={categories}
    selectedCategory=""
    setUrlandReplaceHistory={action('setUrlandReplaceHistory')}
    setUrlandPushHistory={action('setUrlandPushHistory')}
    {...props}
  />
);

export const List = (props: Args) => (
  <PackageListGrid
    list={[
      {
        title: 'Package One',
        description: 'Not Installed Description',
        name: 'beats',
        release: 'ga',
        id: 'package_one',
        version: '1.0.0',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['category_two'],
      },
      {
        title: 'Package Two',
        description: 'Not Installed Description',
        name: 'aws',
        release: 'beta',
        id: 'package_two',
        version: '1.0.0-beta',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['category_one'],
      },
      {
        title: 'Package Three',
        description: 'Not Installed Description',
        name: 'azure',
        release: 'preview',
        id: 'package_three',
        version: '0.1.0',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['web'],
      },
      {
        title: 'Package Four',
        description: 'Installed Description',
        name: 'elastic',
        release: 'ga',
        id: 'package_four',
        version: '1.0.0',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['category_one'],
      },
      {
        title: 'Package Five',
        description: 'Installed Description',
        name: 'unknown',
        release: 'beta',
        id: 'package_five',
        version: '1.0.0-beta',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['category_two'],
      },
      {
        title: 'Package Six',
        description: 'Installed Description',
        name: 'kibana',
        release: 'preview',
        id: 'package_six',
        version: '0.1.0',
        url: 'https://example.com',
        icons: [],
        integration: 'integration',
        categories: ['category_two'],
      },
    ]}
    searchTerm=""
    setSearchTerm={action('setSearchTerm')}
    setCategory={action('setCategory')}
    categories={categories}
    selectedCategory=""
    setUrlandReplaceHistory={action('setUrlandReplaceHistory')}
    setUrlandPushHistory={action('setUrlandPushHistory')}
    {...props}
  />
);

EmptyList.args = args;
List.args = args;
