/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import { CaseCustomFieldTextWithValidationValueRt, CustomFieldPutRequestRt } from './v1';

describe('Custom Fields', () => {
  describe('CaseCustomFieldTextWithValidationValueRt', () => {
    const customFieldValueType = CaseCustomFieldTextWithValidationValueRt('value');

    it('decodes strings correctly', () => {
      const query = customFieldValueType.decode('foobar');

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: 'foobar',
      });
    });

    it('the value cannot be empty', () => {
      expect(PathReporter.report(customFieldValueType.decode(''))[0]).toContain(
        'The value field cannot be an empty string.'
      );
    });

    it(`limits the length to ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          customFieldValueType.decode('#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1))
        )[0]
      ).toContain(
        `The length of the value is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });
  });

  describe('CustomFieldPutRequestRt', () => {
    const defaultRequest = {
      caseVersion: 'WzQ3LDFd',
      value: 'this is a text field value',
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldPutRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes of toggle field in request', () => {
      const newRequest = {
        caseVersion: 'WzQ3LDFd',
        value: false,
      };
      const query = CustomFieldPutRequestRt.decode(newRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: newRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldPutRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it(`throws an error when a text customField is longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          CustomFieldPutRequestRt.decode({
            caseVersion: 'WzQ3LDFd',
            value: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
          })
        )
      ).toContain(
        `The length of the value is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });

    it('throws an error when a text customField is empty', () => {
      expect(
        PathReporter.report(
          CustomFieldPutRequestRt.decode({
            caseVersion: 'WzQ3LDFd',
            value: '',
          })
        )
      ).toContain('The value field cannot be an empty string.');
    });
  });
});
