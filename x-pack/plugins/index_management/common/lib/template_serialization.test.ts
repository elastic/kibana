/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeTemplate, serializeTemplate } from './template_serialization';
import { TemplateDeserialized, TemplateSerialized, IndexMode } from '../types';
import { STANDARD_INDEX_MODE, LOGSDB_INDEX_MODE, TIME_SERIES_MODE } from '../constants';

const defaultSerializedTemplate: TemplateSerialized = {
  template: {},
  index_patterns: ['test'],
  data_stream: {},
};

const defaultDeserializedTemplate: TemplateDeserialized = {
  name: 'my_template',
  indexPatterns: ['test'],
  indexMode: STANDARD_INDEX_MODE,
  _kbnMeta: {
    type: 'default',
    hasDatastream: true,
  },
  allowAutoCreate: 'NO_OVERWRITE',
};

const allowAutoCreateRadioOptions = ['NO_OVERWRITE', 'TRUE', 'FALSE'];
const allowAutoCreateSerializedValues = [undefined, true, false];
const indexModeValues = [STANDARD_INDEX_MODE, LOGSDB_INDEX_MODE, TIME_SERIES_MODE, undefined];

describe('Template serialization', () => {
  describe('serialization of allow_auto_create parameter', () => {
    describe('deserializeTemplate()', () => {
      allowAutoCreateSerializedValues.forEach((value, index) => {
        test(`correctly deserializes ${value} allow_auto_create value`, () => {
          expect(
            deserializeTemplate({
              ...defaultSerializedTemplate,
              name: 'my_template',
              allow_auto_create: value,
            })
          ).toHaveProperty('allowAutoCreate', allowAutoCreateRadioOptions[index]);
        });
      });

      indexModeValues.forEach((value) => {
        test(`correctly deserializes ${value} index mode settings value`, () => {
          expect(
            deserializeTemplate({
              ...defaultSerializedTemplate,
              name: 'my_template',
              template: {
                settings: {
                  index: {
                    mode: value,
                  },
                },
              },
            })
          ).toHaveProperty('indexMode', value ?? STANDARD_INDEX_MODE);
        });
      });
    });

    describe('serializeTemplate()', () => {
      allowAutoCreateRadioOptions.forEach((option, index) => {
        test(`correctly serializes ${option} allowAutoCreate radio option`, () => {
          expect(
            serializeTemplate({
              ...defaultDeserializedTemplate,
              allowAutoCreate: option,
            })
          ).toHaveProperty('allow_auto_create', allowAutoCreateSerializedValues[index]);
        });
      });

      // Only use the first three values (omit undefined)
      indexModeValues.slice(0, 3).forEach((value) => {
        test(`correctly serializes ${value} indexMode option`, () => {
          expect(
            serializeTemplate({
              ...defaultDeserializedTemplate,
              indexMode: value as IndexMode,
            })
          ).toHaveProperty('template.settings.index.mode', value);
        });
      });
    });
  });
});
