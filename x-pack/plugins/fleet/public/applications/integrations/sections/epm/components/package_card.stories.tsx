/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SavedObject } from 'src/core/public';

import type { Installation } from '../../../../../../common';

import type { PackageCardProps } from './package_card';
import { PackageCard } from './package_card';

export default {
  title: 'Sections/EPM/Package Card',
  description: 'A card representing a package available in Fleet',
};

type Args = Omit<PackageCardProps, 'status'> & { width: number };

const args: Args = {
  width: 280,
  title: 'Title',
  description: 'Description',
  name: 'beats',
  release: 'ga',
  id: 'id',
  version: '1.0.0',
  url: '/',
  icons: [],
  integration: '',
  categories: ['foobar'],
};

const argTypes = {
  release: {
    control: {
      type: 'radio',
      options: ['ga', 'beta', 'experimental'],
    },
  },
};

export const NotInstalled = ({ width, ...props }: Args) => (
  <div style={{ width }}>
    {/*
 // @ts-ignore */}
    <PackageCard {...props} status="not_installed" />
  </div>
);

export const Installed = ({ width, ...props }: Args) => {
  const savedObject: SavedObject<Installation> = {
    id: props.id,
    // @ts-expect-error
    type: props.type || '',
    attributes: {
      name: props.name,
      version: props.version,
      install_version: props.version,
      es_index_patterns: {},
      installed_kibana: [],
      installed_kibana_space_id: 'default',
      installed_es: [],
      install_status: 'installed',
      install_source: 'registry',
      install_started_at: '2020-01-01T00:00:00.000Z',
      keep_policies_up_to_date: false,
    },
    references: [],
  };

  return (
    <div style={{ width }}>
      {/*
 // @ts-ignore */}
      <PackageCard {...props} status="installed" savedObject={savedObject} />
    </div>
  );
};

NotInstalled.args = args;
NotInstalled.argTypes = argTypes;
Installed.args = args;
Installed.argTypes = argTypes;
