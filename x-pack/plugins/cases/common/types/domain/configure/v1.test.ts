/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { CaseSeverity } from '../case/v1';
import { ConnectorTypes } from '../connector/v1';
import { CustomFieldTypes } from '../custom_field/v1';
import {
  ConfigurationAttributesRt,
  ConfigurationRt,
  CustomFieldConfigurationWithoutTypeRt,
  TemplateConfigurationRt,
  TextCustomFieldConfigurationRt,
  ToggleCustomFieldConfigurationRt,
  NumberCustomFieldConfigurationRt,
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

  const numberCustomField = {
    key: 'number_custom_field',
    label: 'Number custom field',
    type: CustomFieldTypes.NUMBER,
    required: false,
  };

  const templateWithAllCaseFields = {
    key: 'template_sample_1',
    name: 'Sample template 1',
    description: 'this is first sample template',
    tags: ['foo', 'bar', 'foobar'],
    caseFields: {
      title: 'Case with sample template 1',
      description: 'case desc',
      severity: CaseSeverity.LOW,
      category: null,
      tags: ['sample-1'],
      assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
      customFields: [
        {
          key: 'first_custom_field_key',
          type: 'text',
          value: 'this is a text field value',
        },
      ],
      connector: {
        id: 'none',
        name: 'My Connector',
        type: ConnectorTypes.none,
        fields: null,
      },
      settings: {
        syncAlerts: true,
      },
    },
  };

  const templateWithFewCaseFields = {
    key: 'template_sample_2',
    name: 'Sample template 2',
    tags: [],
    caseFields: {
      title: 'Case with sample template 2',
      tags: ['sample-2'],
    },
  };

  const templateWithNoCaseFields = {
    key: 'template_sample_3',
    name: 'Sample template 3',
    caseFields: null,
  };

  describe('ConfigurationAttributesRt', () => {
    const defaultRequest = {
      connector: resilient,
      closure_type: 'close-by-user',
      customFields: [textCustomField, toggleCustomField, numberCustomField],
      templates: [],
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
          customFields: [textCustomField, toggleCustomField, numberCustomField],
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          customFields: [textCustomField, toggleCustomField, numberCustomField],
        },
      });
    });

    it('removes foo:bar attributes from custom fields', () => {
      const query = ConfigurationAttributesRt.decode({
        ...defaultRequest,
        customFields: [{ ...textCustomField, foo: 'bar' }, toggleCustomField, numberCustomField],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          customFields: [textCustomField, toggleCustomField, numberCustomField],
        },
      });
    });
  });

  describe('ConfigurationRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      customFields: [],
      templates: [templateWithAllCaseFields, templateWithFewCaseFields, templateWithNoCaseFields],
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

  describe('NumberCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_number_custom_field',
      label: 'Number Custom Field',
      type: CustomFieldTypes.NUMBER,
      required: false,
    };

    it('has expected attributes in request with required: false', () => {
      const query = NumberCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue and required: true', () => {
      const query = NumberCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        required: true,
        defaultValue: 0,
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          required: true,
          defaultValue: 0,
        },
      });
    });

    it('defaultValue fails if the type is not number', () => {
      expect(
        PathReporter.report(
          NumberCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            required: true,
            defaultValue: 'foobar',
          })
        )[0]
      ).toContain('Invalid value "foobar" supplied');
    });

    it('removes foo:bar attributes from request', () => {
      const query = NumberCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });
  });

  describe('TemplateConfigurationRt', () => {
    const defaultRequest = templateWithAllCaseFields;

    it('has expected attributes in request ', () => {
      const query = TemplateConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = TemplateConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from caseFields', () => {
      const query = TemplateConfigurationRt.decode({
        ...defaultRequest,
        caseFields: { ...templateWithAllCaseFields.caseFields, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('accepts few caseFields', () => {
      const query = TemplateConfigurationRt.decode(templateWithFewCaseFields);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...templateWithFewCaseFields },
      });
    });

    it('accepts null for caseFields', () => {
      const query = TemplateConfigurationRt.decode({
        ...defaultRequest,
        caseFields: null,
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, caseFields: null },
      });
    });

    it('accepts {} for caseFields', () => {
      const query = TemplateConfigurationRt.decode({
        ...defaultRequest,
        caseFields: {},
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, caseFields: {} },
      });
    });
  });
});
