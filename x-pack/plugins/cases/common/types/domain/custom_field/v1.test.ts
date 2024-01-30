/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { CaseCustomFieldRt } from './v1';

describe('CaseCustomFieldRt', () => {
  it.each([
    [
      'type text value text',
      {
        key: 'string_custom_field_1',
        type: 'text',
        value: 'this is a text field value',
      },
    ],
    [
      'type text value null',
      {
        key: 'string_custom_field_2',
        type: 'text',
        value: null,
      },
    ],
    [
      'type toggle value boolean',
      {
        key: 'toggle_custom_field_1',
        type: 'toggle',
        value: true,
      },
    ],
    [
      'type toggle value null',
      {
        key: 'toggle_custom_field_2',
        type: 'toggle',
        value: null,
      },
    ],
  ])(`has expected attributes for customField with %s`, (_, customField) => {
    const query = CaseCustomFieldRt.decode(customField);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: customField,
    });
  });

  it('fails if text type and value do not match expected attributes in request', () => {
    const query = CaseCustomFieldRt.decode({
      key: 'text_custom_field_1',
      type: 'text',
      value: 1,
    });

    expect(PathReporter.report(query)[0]).toContain('Invalid value 1 supplied');
  });

  it('fails if toggle type and value do not match expected attributes in request', () => {
    const query = CaseCustomFieldRt.decode({
      key: 'list_custom_field_1',
      type: 'toggle',
      value: 'hello',
    });

    expect(PathReporter.report(query)[0]).toContain('Invalid value "hello" supplied');
  });
});
