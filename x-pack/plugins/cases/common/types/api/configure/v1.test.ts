/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { v4 as uuidv4 } from 'uuid';
import {
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_CUSTOM_FIELD_KEY_LENGTH,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
} from '../../../constants';
import { ConnectorTypes } from '../../domain/connector/v1';
import { CustomFieldTypes } from '../../domain/custom_field/v1';
import {
  CaseConfigureRequestParamsRt,
  ConfigurationPatchRequestRt,
  ConfigurationRequestRt,
  GetConfigurationFindRequestRt,
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

  describe('ConfigurationRequestRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      owner: 'Cases',
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes in request with customFields', () => {
      const request = {
        ...defaultRequest,
        customFields: [
          {
            key: 'text_custom_field',
            label: 'Text custom field',
            type: CustomFieldTypes.TEXT,
            required: false,
          },
          {
            key: 'toggle_custom_field',
            label: 'Toggle custom field',
            type: CustomFieldTypes.TOGGLE,
            required: false,
          },
        ],
      };
      const query = ConfigurationRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits customFields to ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });

      expect(
        PathReporter.report(ConfigurationRequestRt.decode({ ...defaultRequest, customFields }))[0]
      ).toContain(
        `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}`
      );
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ConfigurationPatchRequestRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      version: 'WzQ3LDFd',
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationPatchRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes in request with customFields', () => {
      const request = {
        ...defaultRequest,
        customFields: [
          {
            key: 'text_custom_field',
            label: 'Text custom field',
            type: CustomFieldTypes.TEXT,
            required: false,
          },
          {
            key: 'toggle_custom_field',
            label: 'Toggle custom field',
            type: CustomFieldTypes.TOGGLE,
            required: false,
          },
        ],
      };
      const query = ConfigurationPatchRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits customFields to ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });

      expect(
        PathReporter.report(
          ConfigurationPatchRequestRt.decode({ ...defaultRequest, customFields })
        )[0]
      ).toContain(
        `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}`
      );
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationPatchRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('GetConfigurationFindRequestRt', () => {
    const defaultRequest = {
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const query = GetConfigurationFindRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = GetConfigurationFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseConfigureRequestParamsRt', () => {
    const defaultRequest = {
      configuration_id: 'basic-configuration-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseConfigureRequestParamsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConfigureRequestParamsRt.decode({ ...defaultRequest, foo: 'bar' });

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

    it('limits key to 36 characters', () => {
      const longKey = 'x'.repeat(MAX_CUSTOM_FIELD_KEY_LENGTH + 1);

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key: longKey })
        )
      ).toContain('The length of the key is too long. The maximum length is 36.');
    });

    it('returns an error if they key is not in the expected format', () => {
      const key = 'Not a proper key';

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key })
        )
      ).toContain(`Key must be lower case, a-z, 0-9, '_', and '-' are allowed`);
    });

    it('accepts a uuid as a key', () => {
      const key = uuidv4();

      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('accepts a slug as a key', () => {
      const key = 'abc_key-1';

      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('limits label to 50 characters', () => {
      const longLabel = 'x'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, label: longLabel })
        )
      ).toContain('The length of the label is too long. The maximum length is 50.');
    });
  });

  describe('TextCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      required: true,
    };

    it('has expected attributes in request', () => {
      const query = TextCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue', () => {
      const query = TextCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        defaultValue: 'foobar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, defaultValue: 'foobar' },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = TextCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('defaultValue fails if the type is not string', () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: false,
          })
        )[0]
      ).toContain('Invalid value false supplied');
    });

    it(`throws an error if the default value is longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
          })
        )[0]
      ).toContain(
        `The length of the defaultValue is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });

    it('throws an error if the default value is an empty string', () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: '',
          })
        )[0]
      ).toContain('The defaultValue field cannot be an empty string.');
    });
  });

  describe('ToggleCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    };

    it('has expected attributes in request', () => {
      const query = ToggleCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ToggleCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
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
  });
});
