/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomFieldTypes,
  CustomFieldRt,
  TextCustomFieldRt,
  ListCustomFieldRt,
  ToggleCustomFieldRt,
} from './v1';

describe('CustomField', () => {
  describe('CustomFieldRt', () => {
    const defaultRequest = {
      key: 'custom_field_key',
      label: 'Custom field label',
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });
  });

  describe('TextCustomFieldRt', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      limit: 150,
      required: true,
    };

    it('has expected attributes in request', () => {
      const query = TextCustomFieldRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = TextCustomFieldRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });
  });

  describe('ListCustomFieldRt', () => {
    const defaultRequest = {
      key: 'my_list_custom_field',
      label: 'List Custom Field',
      type: CustomFieldTypes.LIST,
      options: ['option 1', 'option 2', 'option 3'],
      singleSelection: true,
    };

    it('has expected attributes in request', () => {
      const query = ListCustomFieldRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ListCustomFieldRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });
  });

  describe('ToggleCustomFieldRt', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
    };

    it('has expected attributes in request', () => {
      const query = ToggleCustomFieldRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ToggleCustomFieldRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, required: undefined },
      });
    });
  });
});
