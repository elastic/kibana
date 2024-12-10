/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formSerializer, formDeserializer } from './configuration_form';
import {
  STORED_SOURCE_OPTION,
  SYNTHETIC_SOURCE_OPTION,
  DISABLED_SOURCE_OPTION,
} from './source_field_section';

describe('Template serialization', () => {
  describe('serialization of _source parameter', () => {
    describe('deserializeTemplate()', () => {
      test(`correctly deserializes 'stored' mode`, () => {
        expect(
          formDeserializer({
            _source: {
              mode: 'stored',
              includes: ['hello'],
              excludes: ['world'],
            },
          })
        ).toHaveProperty('sourceField', {
          option: STORED_SOURCE_OPTION,
          includes: ['hello'],
          excludes: ['world'],
        });
      });

      test(`correctly deserializes 'enabled' property set to true`, () => {
        expect(
          formDeserializer({
            _source: {
              enabled: true,
              includes: ['hello'],
              excludes: ['world'],
            },
          })
        ).toHaveProperty('sourceField', {
          includes: ['hello'],
          excludes: ['world'],
        });
      });

      test(`correctly deserializes 'enabled' property set to false`, () => {
        expect(
          formDeserializer({
            _source: {
              enabled: false,
            },
          })
        ).toHaveProperty('sourceField', {
          option: DISABLED_SOURCE_OPTION,
        });
      });

      test(`correctly deserializes 'synthetic' mode`, () => {
        expect(
          formDeserializer({
            _source: {
              mode: 'synthetic',
            },
          })
        ).toHaveProperty('sourceField', {
          option: SYNTHETIC_SOURCE_OPTION,
        });
      });

      test(`correctly deserializes undefined mode and enabled properties with includes or excludes fields`, () => {
        expect(
          formDeserializer({
            _source: {
              includes: ['hello'],
              excludes: ['world'],
            },
          })
        ).toHaveProperty('sourceField', {
          includes: ['hello'],
          excludes: ['world'],
        });
      });
    });

    describe('serializeTemplate()', () => {
      test(`correctly serializes 'stored' option`, () => {
        expect(
          formSerializer({
            sourceField: {
              option: STORED_SOURCE_OPTION,
              includes: ['hello'],
              excludes: ['world'],
            },
          })
        ).toHaveProperty('_source', {
          mode: 'stored',
          includes: ['hello'],
          excludes: ['world'],
        });
      });

      test(`correctly serializes 'disabled' option`, () => {
        expect(
          formSerializer({
            sourceField: {
              option: DISABLED_SOURCE_OPTION,
            },
          })
        ).toHaveProperty('_source', {
          enabled: false,
        });
      });

      test(`correctly serializes 'synthetic' option`, () => {
        expect(
          formSerializer({
            sourceField: {
              option: SYNTHETIC_SOURCE_OPTION,
            },
          })
        ).toHaveProperty('_source', {
          mode: 'synthetic',
        });
      });

      test(`correctly serializes undefined option with includes or excludes fields`, () => {
        expect(
          formSerializer({
            sourceField: {
              includes: ['hello'],
              excludes: ['world'],
            },
          })
        ).toHaveProperty('_source', {
          includes: ['hello'],
          excludes: ['world'],
        });
      });
    });
  });
});
