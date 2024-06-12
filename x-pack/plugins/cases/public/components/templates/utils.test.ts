/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateSerializedData, removeEmptyFields } from './utils';

describe('utils', () => {
  describe('getTemplateSerializedData', () => {
    it('serializes empty fields correctly', () => {
      const res = getTemplateSerializedData({
        key: '',
        name: '',
        templateDescription: '',
        title: '',
        description: '',
        templateTags: [],
        tags: [],
        fields: null,
        category: null,
      });

      expect(res).toEqual({ fields: null });
    });

    it('serializes connectors fields correctly', () => {
      const res = getTemplateSerializedData({
        key: '',
        name: '',
        templateDescription: '',
        fields: null,
      });

      expect(res).toEqual({
        fields: null,
      });
    });

    it('serializes non empty fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
        templateTags: ['sample'],
        category: 'new',
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
        category: 'new',
        templateTags: ['sample'],
        fields: null,
      });
    });

    it('serializes custom fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: '',
        customFields: {
          custom_field_1: 'foobar',
          custom_fields_2: '',
          custom_field_3: true,
        },
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        customFields: {
          custom_field_1: 'foobar',
          custom_field_3: true,
        },
        fields: null,
      });
    });

    it('serializes connector fields correctly', () => {
      const res = getTemplateSerializedData({
        key: 'key_1',
        name: 'template 1',
        templateDescription: '',
        fields: {
          impact: 'high',
          severity: 'low',
          category: null,
          urgency: null,
          subcategory: null,
        },
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        fields: {
          impact: 'high',
          severity: 'low',
          category: null,
          urgency: null,
          subcategory: null,
        },
      });
    });
  });

  describe('removeEmptyFields', () => {
    it('removes empty fields', () => {
      const res = removeEmptyFields({
        key: '',
        name: '',
        templateDescription: '',
        title: '',
        description: '',
        templateTags: [],
        tags: [],
        fields: null,
      });

      expect(res).toEqual({});
    });

    it('does not remove not empty fields', () => {
      const res = removeEmptyFields({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
      });

      expect(res).toEqual({
        key: 'key_1',
        name: 'template 1',
        templateDescription: 'description 1',
      });
    });
  });
});
