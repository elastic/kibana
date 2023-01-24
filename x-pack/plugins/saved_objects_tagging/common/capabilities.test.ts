/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/types';
import { getTagsCapabilities } from './capabilities';
import { tagFeatureId } from './constants';

const createCapabilities = (taggingCaps: Record<string, boolean> | undefined): Capabilities => ({
  navLinks: {},
  management: {},
  catalogue: {},
  ...(taggingCaps ? { [tagFeatureId]: taggingCaps } : {}),
});

describe('getTagsCapabilities', () => {
  it('generates the tag capabilities', () => {
    expect(
      getTagsCapabilities(
        createCapabilities({
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: true,
        })
      )
    ).toEqual({
      view: true,
      create: false,
      edit: false,
      delete: false,
      assign: true,
      viewConnections: false,
    });
  });

  it('returns all capabilities as disabled if the tag feature in not present', () => {
    expect(getTagsCapabilities(createCapabilities(undefined))).toEqual({
      view: false,
      create: false,
      edit: false,
      delete: false,
      assign: false,
      viewConnections: false,
    });
  });

  it('populates `viewConnections` from the so management capabilities', () => {
    expect(
      getTagsCapabilities({
        ...createCapabilities(undefined),
        ...{
          savedObjectsManagement: {
            read: true,
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        viewConnections: true,
      })
    );
  });
});
