/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeTemplate, serializeTemplate } from './template_serialization';
import { TemplateDeserialized, TemplateSerialized } from '../types';

const defaultSerializedTemplate: TemplateSerialized = {
  template: {},
  index_patterns: ['test'],
  data_stream: {},
};

const defaultDeserializedTemplate: TemplateDeserialized = {
  name: 'my_template',
  indexPatterns: ['test'],
  _kbnMeta: {
    type: 'default',
    hasDatastream: true,
  },
  allowAutoCreate: 'NO_OVERWRITE',
};

const allowAutoCreateRadioOptions = ['NO_OVERWRITE', 'TRUE', 'FALSE'];
const allowAutoCreateSerializedValues = [undefined, true, false];

describe('Template serialization', () => {
  describe('serialization of allow_auto_create parameter', () => {
    describe('deserializeTemplate()', () => {
      allowAutoCreateSerializedValues.forEach((value, index) => {
        test(`correctly deserializes ${value} value`, () => {
          expect(
            deserializeTemplate({
              ...defaultSerializedTemplate,
              name: 'my_template',
              allow_auto_create: value,
            })
          ).toHaveProperty('allowAutoCreate', allowAutoCreateRadioOptions[index]);
        });
      });
    });

    describe('serializeTemplate()', () => {
      allowAutoCreateRadioOptions.forEach((option, index) => {
        test(`correctly serializes ${option} radio option`, () => {
          expect(
            serializeTemplate({
              ...defaultDeserializedTemplate,
              allowAutoCreate: option,
            })
          ).toHaveProperty('allow_auto_create', allowAutoCreateSerializedValues[index]);
        });
      });
    });
  });
});
