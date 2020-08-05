/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../features/server';
import { validateReservedPrivileges } from './validate_reserved_privileges';

it('allows features to be defined without privileges', () => {
  const feature: Feature = new Feature({
    id: 'foo',
    name: 'foo',
    app: [],
    privileges: null,
  });

  validateReservedPrivileges([feature]);
});

it('allows features with a single reserved privilege to be defined', () => {
  const feature: Feature = new Feature({
    id: 'foo',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  validateReservedPrivileges([feature]);
});

it('allows multiple features with reserved privileges to be defined', () => {
  const feature1: Feature = new Feature({
    id: 'foo',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved-1',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  const feature2: Feature = new Feature({
    id: 'foo2',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved-2',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  validateReservedPrivileges([feature1, feature2]);
});

it('prevents a feature from specifying the same reserved privilege id', () => {
  const feature1: Feature = new Feature({
    id: 'foo',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  expect(() => validateReservedPrivileges([feature1])).toThrowErrorMatchingInlineSnapshot(
    `"Duplicate reserved privilege id detected: reserved. This is not allowed."`
  );
});

it('prevents features from sharing a reserved privilege id', () => {
  const feature1: Feature = new Feature({
    id: 'foo',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  const feature2: Feature = new Feature({
    id: 'foo2',
    name: 'foo',
    app: [],
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  expect(() => validateReservedPrivileges([feature1, feature2])).toThrowErrorMatchingInlineSnapshot(
    `"Duplicate reserved privilege id detected: reserved. This is not allowed."`
  );
});
