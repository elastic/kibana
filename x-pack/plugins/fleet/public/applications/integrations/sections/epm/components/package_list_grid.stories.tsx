/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { action } from '@storybook/addon-actions';

import type { SavedObject } from 'src/core/public';

import type { Installation } from '../../../../../../common';

import type { IntegrationCardItem } from '../../../../../../common';

import type { ListProps } from './package_list_grid';
import { PackageListGrid } from './package_list_grid';

export default {
  component: PackageListGrid,
  title: 'Sections/EPM/Package List Grid',
};

type Args = Pick<ListProps, 'title' | 'isLoading' | 'showMissingIntegrationMessage'>;

const args: Args = {
  title: 'Installed integrations',
  isLoading: false,
  showMissingIntegrationMessage: false,
};

const savedObject: SavedObject<Installation> = {
  id: 'id',
  type: 'integration',
  attributes: {
    name: 'savedObject',
    version: '1.2.3',
    install_version: '1.2.3',
    es_index_patterns: {},
    installed_kibana: [],
    installed_es: [],
    install_status: 'installed',
    install_source: 'registry',
    install_started_at: '2020-01-01T00:00:00.000Z',
    keep_policies_up_to_date: false,
  },
  references: [],
};

export const EmptyList = (props: Args) => (
  <PackageListGrid
    list={[]}
    onSearchChange={action('onSearchChange')}
    setSelectedCategory={action('setSelectedCategory')}
    {...props}
  />
);

export const List = (props: Args) => (
  <PackageListGrid
    list={
      [
        {
          title: 'Package One',
          description: 'Not Installed Description',
          name: 'beats',
          release: 'ga',
          id: 'package_one',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'not_installed',
        },
        {
          title: 'Package Two',
          description: 'Not Installed Description',
          name: 'aws',
          release: 'beta',
          id: 'package_two',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'not_installed',
        },
        {
          title: 'Package Three',
          description: 'Not Installed Description',
          name: 'azure',
          release: 'experimental',
          id: 'package_three',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'not_installed',
        },
        {
          title: 'Package Four',
          description: 'Installed Description',
          name: 'elastic',
          release: 'ga',
          id: 'package_four',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'installed',
          savedObject: {
            ...savedObject,
            id: 'package_four',
          },
        },
        {
          title: 'Package Five',
          description: 'Installed Description',
          name: 'unknown',
          release: 'beta',
          id: 'package_five',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'installed',
          savedObject: {
            ...savedObject,
            id: 'package_five',
          },
        },
        {
          title: 'Package Six',
          description: 'Installed Description',
          name: 'kibana',
          release: 'experimental',
          id: 'package_six',
          version: '1.0.0',
          uiInternalPath: '/',
          path: 'path',
          status: 'installed',
          savedObject: {
            ...savedObject,
            id: 'package_six',
          },
        },
      ] as unknown as IntegrationCardItem[]
    }
    onSearchChange={action('onSearchChange')}
    setSelectedCategory={action('setSelectedCategory')}
    {...props}
  />
);

EmptyList.args = args;
List.args = args;
