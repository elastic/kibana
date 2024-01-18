/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { ConnectorTypes } from '../connector/v1';
import { CustomFieldTypes } from '../custom_field/v1';
import {
  ConfigurationAttributesRt,
  ConfigurationRt,
  CustomFieldConfigurationWithoutTypeRt,
  TextCustomFieldConfigurationRt,
  ToggleCustomFieldConfigurationRt,
} from './v1';

describe('configure', () => {
  const serviceNow = {
    id: 'servicenow-1',
    name: 'SN 1',
    type: ConnectorTypes.serviceNowITSM,
    fields: null,
  };

  const resilient = {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  };

  const textCustomField = {
    key: 'text_custom_field',
    label: 'Text custom field',
    type: CustomFieldTypes.TEXT,
    required: false,
  };

  const toggleCustomField = {
    key: 'toggle_custom_field',
    label: 'Toggle custom field',
    type: CustomFieldTypes.TOGGLE,
    required: false,
  };

  describe('ConfigurationAttributesRt', () => {
    const defaultRequest = {
      connector: resilient,
      closure_type: 'close-by-user',
      customFields: [textCustomField, toggleCustomField],
      owner: 'cases',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          customFields: [textCustomField, toggleCustomField],
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          customFields: [textCustomField, toggleCustomField],
        },
      });
    });

    it('removes foo:bar attributes from custom fields', () => {
      const query = ConfigurationAttributesRt.decode({
        ...defaultRequest,
        customFields: [{ ...textCustomField, foo: 'bar' }, toggleCustomField],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          customFields: [textCustomField, toggleCustomField],
        },
      });
    });
  });

  describe('ConfigurationRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      customFields: [],
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: null,
      mappings: [
        {
          source: 'description',
          target: 'description',
          action_type: 'overwrite',
        },
      ],
      owner: 'cases',
      version: 'WzQ3LDFd',
      id: 'case-id',
      error: null,
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from mappings', () => {
      const query = ConfigurationRt.decode({
        ...defaultRequest,
        mappings: [{ ...defaultRequest.mappings[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CustomFieldConfigurationWithoutTypeRt', () => {
    const defaultRequest = {
      key: 'custom_field_key',
      label: 'Custom field label',
      required: false,
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldConfigurationWithoutTypeRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });
  });

  describe('TextCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      required: false,
    };

    it('has expected attributes in request with required: false', () => {
      const query = TextCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue and required: true', () => {
      const query = TextCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          required: true,
          defaultValue: 'foobar',
        },
      });
    });

    it('defaultValue fails if the type is not string', () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            required: true,
            defaultValue: false,
          })
        )[0]
      ).toContain('Invalid value false supplied');
    });

    it('removes foo:bar attributes from request', () => {
      const query = TextCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });
  });

  describe('ToggleCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    };

    it('has expected attributes in request with required: false', () => {
      const query = ToggleCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue and required: true', () => {
      const query = ToggleCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        required: true,
        defaultValue: false,
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          required: true,
          defaultValue: false,
        },
      });
    });

    it('defaultValue fails if the type is not boolean', () => {
      expect(
        PathReporter.report(
          ToggleCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            required: true,
            defaultValue: 'foobar',
          })
        )[0]
      ).toContain('Invalid value "foobar" supplied');
    });

    it('removes foo:bar attributes from request', () => {
      const query = ToggleCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });
  });
});
