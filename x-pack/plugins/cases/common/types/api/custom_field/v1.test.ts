/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import { CaseCustomFieldTextWithValidationValueRt } from './v1';

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
});
