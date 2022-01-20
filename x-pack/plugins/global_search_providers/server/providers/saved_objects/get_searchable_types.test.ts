/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectTypeRegistry } from '../../../../../../src/core/server';
import { getSearchableTypes } from './get_searchable_types';

describe('getSearchableTypes', () => {
  let registry: SavedObjectTypeRegistry;

  beforeEach(() => {
    registry = new SavedObjectTypeRegistry();
  });

  const registerType = ({
    name,
    displayName,
    hidden = false,
    noSearchField = false,
    noGetInAppUrl = false,
  }: {
    name: string;
    displayName?: string;
    hidden?: boolean;
    noSearchField?: boolean;
    noGetInAppUrl?: boolean;
  }) => {
    registry.registerType({
      name,
      hidden,
      management: {
        displayName,
        defaultSearchField: noSearchField ? undefined : 'title',
        getInAppUrl: noGetInAppUrl
          ? undefined
          : () => ({ path: 'path', uiCapabilitiesPath: 'uiCapabilitiesPath' }),
      },
      namespaceType: 'multiple',
      mappings: { properties: {} },
    });
  };

  it('returns registered types that match', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar' });
    registerType({ name: 'dolly' });

    const matching = getSearchableTypes(registry, ['foo', 'dolly']).map((type) => type.name);
    expect(matching).toEqual(['foo', 'dolly']);
  });

  it('ignores hidden types', () => {
    registerType({ name: 'foo', hidden: true });
    registerType({ name: 'bar' });
    registerType({ name: 'dolly' });

    const matching = getSearchableTypes(registry, ['foo', 'dolly']).map((type) => type.name);
    expect(matching).toEqual(['dolly']);
  });

  it('ignores types without `defaultSearchField`', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar' });
    registerType({ name: 'dolly', noSearchField: true });

    const matching = getSearchableTypes(registry, ['foo', 'dolly']).map((type) => type.name);
    expect(matching).toEqual(['foo']);
  });

  it('ignores types without `getInAppUrl`', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar' });
    registerType({ name: 'dolly', noGetInAppUrl: true });

    const matching = getSearchableTypes(registry, ['foo', 'dolly']).map((type) => type.name);
    expect(matching).toEqual(['foo']);
  });

  it('matches ignoring case', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar' });
    registerType({ name: 'dolly' });

    const matching = getSearchableTypes(registry, ['FOO', 'DolLy']).map((type) => type.name);
    expect(matching).toEqual(['foo', 'dolly']);
  });

  it('matches against the display name when provided', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar', displayName: 'display' });
    registerType({ name: 'dolly', displayName: 'name' });

    const matching = getSearchableTypes(registry, ['display', 'name']).map((type) => type.name);
    expect(matching).toEqual(['bar', 'dolly']);
  });

  it('ignores cases against the display name', () => {
    registerType({ name: 'foo' });
    registerType({ name: 'bar', displayName: 'display' });
    registerType({ name: 'dolly', displayName: 'name' });

    const matching = getSearchableTypes(registry, ['DISPLAY', 'NaMe']).map((type) => type.name);
    expect(matching).toEqual(['bar', 'dolly']);
  });

  it('replaces whitespaces with dashes when matching against the display name', () => {
    registerType({ name: 'dashboard' });
    registerType({ name: 'index-pattern', displayName: 'data view' });
    registerType({ name: 'map', displayName: 'my super display name' });

    const matching = getSearchableTypes(registry, ['data-view', 'my-super-display-name']).map(
      (type) => type.name
    );
    expect(matching).toEqual(['index-pattern', 'map']);
  });

  it('replaces whitespaces with dashes when matching against the name', () => {
    registerType({ name: 'dashboard' });
    registerType({ name: 'index-pattern' });
    registerType({ name: 'new-map' });

    const matching = getSearchableTypes(registry, ['index pattern', 'new map']).map(
      (type) => type.name
    );
    expect(matching).toEqual(['index-pattern', 'new-map']);
  });
});
