/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

jest.mock('../../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import { useSourceSubNav } from './source_sub_nav';

describe('useSourceSubNav', () => {
  it('returns undefined when no content source id present', () => {
    setMockValues({ contentSource: {} });

    expect(useSourceSubNav()).toEqual(undefined);
  });

  it('returns EUI nav items', () => {
    setMockValues({ isOrganization: true, contentSource: { id: '1', name: 'foo' } });

    expect(useSourceSubNav()).toEqual([
      {
        id: 'sourceName',
        name: <strong>foo</strong>,
      },
      {
        id: 'sourceOverview',
        name: 'Overview',
        href: '/sources/1',
      },
      {
        id: 'sourceContent',
        name: 'Content',
        href: '/sources/1/content',
      },
      {
        id: 'sourceSettings',
        name: 'Settings',
        href: '/sources/1/settings',
      },
    ]);
  });

  it('returns extra nav items for custom sources', () => {
    setMockValues({
      isOrganization: true,
      contentSource: { id: '2', serviceType: 'custom', name: 'foo' },
    });

    expect(useSourceSubNav()).toEqual([
      {
        id: 'sourceName',
        name: <strong>foo</strong>,
      },
      {
        id: 'sourceOverview',
        name: 'Overview',
        href: '/sources/2',
      },
      {
        id: 'sourceContent',
        name: 'Content',
        href: '/sources/2/content',
      },
      {
        id: 'sourceSchema',
        name: 'Schema',
        href: '/sources/2/schemas',
      },
      {
        id: 'sourceDisplaySettings',
        name: 'Display Settings',
        href: '/sources/2/display_settings',
      },
      {
        id: 'sourceSettings',
        name: 'Settings',
        href: '/sources/2/settings',
      },
    ]);
  });

  it('returns extra nav items for synchronization', () => {
    setMockValues({
      isOrganization: true,
      contentSource: { id: '2', isIndexedSource: true, name: 'foo', isSyncConfigEnabled: true },
    });

    expect(useSourceSubNav()).toEqual([
      {
        id: 'sourceName',
        name: <strong>foo</strong>,
      },
      {
        id: 'sourceOverview',
        name: 'Overview',
        href: '/sources/2',
      },
      {
        id: 'sourceContent',
        name: 'Content',
        href: '/sources/2/content',
      },
      {
        id: 'sourceSynchronization',
        name: 'Synchronization',
        href: '/sources/2/synchronization',
        items: [
          {
            id: 'sourceSynchronizationFrequency',
            name: 'Frequency',
            href: '/sources/2/synchronization/frequency',
          },
          {
            id: 'sourceSynchronizationAssetsAndObjects',
            name: 'Assets and objects',
            href: '/sources/2/synchronization/assets_and_objects',
          },
        ],
      },
      {
        id: 'sourceSettings',
        name: 'Settings',
        href: '/sources/2/settings',
      },
    ]);
  });

  it('returns nav links to personal dashboard when not on an organization page', () => {
    setMockValues({ isOrganization: false, contentSource: { id: '3', name: 'foo' } });

    expect(useSourceSubNav()).toEqual([
      {
        id: 'sourceName',
        name: <strong>foo</strong>,
      },
      {
        id: 'sourceOverview',
        name: 'Overview',
        href: '/p/sources/3',
      },
      {
        id: 'sourceContent',
        name: 'Content',
        href: '/p/sources/3/content',
      },
      {
        id: 'sourceSettings',
        name: 'Settings',
        href: '/p/sources/3/settings',
      },
    ]);
  });
});
