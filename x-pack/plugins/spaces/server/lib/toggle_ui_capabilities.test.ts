/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../common/model/space';
import { toggleUICapabilities } from './toggle_ui_capabilities';

const features: Feature[] = [
  {
    id: 'feature_1',
    name: 'Feature 1',
    privileges: {},
  },
  {
    id: 'feature_2',
    name: 'Feature 2',
    navLinkId: 'feature2',
    privileges: {
      all: {
        management: {
          kibana: ['somethingElse'],
        },
        app: [],
        ui: [],
        savedObject: {
          all: [],
          read: [],
        },
      },
    },
  },
  {
    id: 'feature_3',
    name: 'Feature 3',
    navLinkId: 'feature3',
    privileges: {
      all: {
        management: {
          kibana: ['indices'],
        },
        app: [],
        ui: [],
        savedObject: {
          all: [],
          read: [],
        },
      },
    },
  },
];

const buildUiCapabilities = () =>
  Object.freeze({
    navLinks: {
      feature1: true,
      feature2: true,
      feature3: true,
      unknownFeature: true,
    },
    management: {
      kibana: {
        settings: false,
        indices: true,
        somethingElse: true,
      },
    },
    feature_1: {
      foo: true,
      bar: true,
    },
    feature_2: {
      foo: true,
      bar: true,
    },
    feature_3: {
      foo: true,
      bar: true,
    },
  });

describe('toggleUiCapabilities', () => {
  it('does not toggle capabilities when the space has no disabled features', () => {
    const space: Space = {
      id: 'space',
      name: '',
      disabledFeatures: [],
    };

    const uiCapabilities: UICapabilities = buildUiCapabilities();
    const result = toggleUICapabilities(features, uiCapabilities, space);
    expect(result).toEqual(buildUiCapabilities());
  });

  it('ignores unknown disabledFeatures', () => {
    const space: Space = {
      id: 'space',
      name: '',
      disabledFeatures: ['i-do-not-exist'],
    };

    const uiCapabilities: UICapabilities = buildUiCapabilities();
    const result = toggleUICapabilities(features, uiCapabilities, space);
    expect(result).toEqual(buildUiCapabilities());
  });

  it('disables the corresponding navLink, management sections, and all capability flags for disabled features', () => {
    const space: Space = {
      id: 'space',
      name: '',
      disabledFeatures: ['feature_2'],
    };

    const uiCapabilities: UICapabilities = buildUiCapabilities();
    const result = toggleUICapabilities(features, uiCapabilities, space);

    const expectedCapabilities = buildUiCapabilities();

    expectedCapabilities.navLinks.feature2 = false;
    expectedCapabilities.management.kibana.somethingElse = false;
    expectedCapabilities.feature_2.bar = false;
    expectedCapabilities.feature_2.foo = false;

    expect(result).toEqual(expectedCapabilities);
  });

  it('can disable everything', () => {
    const space: Space = {
      id: 'space',
      name: '',
      disabledFeatures: ['feature_1', 'feature_2', 'feature_3'],
    };

    const uiCapabilities: UICapabilities = buildUiCapabilities();
    const result = toggleUICapabilities(features, uiCapabilities, space);

    const expectedCapabilities = buildUiCapabilities();

    expectedCapabilities.feature_1.bar = false;
    expectedCapabilities.feature_1.foo = false;

    expectedCapabilities.navLinks.feature2 = false;
    expectedCapabilities.management.kibana.somethingElse = false;
    expectedCapabilities.feature_2.bar = false;
    expectedCapabilities.feature_2.foo = false;

    expectedCapabilities.navLinks.feature3 = false;
    expectedCapabilities.management.kibana.indices = false;
    expectedCapabilities.feature_3.bar = false;
    expectedCapabilities.feature_3.foo = false;

    expect(result).toEqual(expectedCapabilities);
  });
});
