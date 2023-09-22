/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { CustomFieldsUserActionPayloadRt, CustomFieldsUserActionRt } from './v1';

describe('Custom field', () => {
  describe('CustomFieldsUserActionPayloadRt', () => {
    const defaultRequest = {
      customField: {
        key: 'first_custom_field_key',
        type: 'text',
        field: { value: ['this is a text field value'] },
      },
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldsUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldsUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from the field', () => {
      const query = CustomFieldsUserActionPayloadRt.decode({
        ...defaultRequest,
        customField: {
          ...defaultRequest.customField,
          field: { ...defaultRequest.customField.field, foo: 'bar' },
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CustomFieldsUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.customField,
      payload: {
        customField: {
          key: 'first_custom_field_key',
          type: 'text',
          field: { value: ['this is a text field value'] },
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldsUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldsUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = CustomFieldsUserActionRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from the field', () => {
      const query = CustomFieldsUserActionRt.decode({
        ...defaultRequest,
        payload: {
          ...defaultRequest.payload,
          customField: { ...defaultRequest.payload.customField, foo: 'bar' },
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
