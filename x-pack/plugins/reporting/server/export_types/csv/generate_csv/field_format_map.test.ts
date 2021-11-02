/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DataView } from 'src/plugins/data/common';
import {
  FieldFormatsGetConfigFn,
  FieldFormatsRegistry,
  BytesFormat,
  NumberFormat,
  FORMATS_UI_SETTINGS,
} from 'src/plugins/field_formats/common';
import { fieldFormatMapFactory } from './field_format_map';

type ConfigValue = { number: { id: string; params: {} } } | string;

describe('field format map', function () {
  const dataView = {
    fields: [
      { name: 'field1', type: 'number' },
      { name: 'field2', type: 'number' },
    ],
    fieldFormatMap: { field1: { id: 'bytes', params: { pattern: '0,0.[0]b' } } },
  } as unknown as DataView;
  const configMock: Record<string, ConfigValue> = {};
  configMock[FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP] = {
    number: { id: 'number', params: {} },
  };
  configMock[FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN] = '0,0.[000]';
  const getConfig = ((key: string) => configMock[key]) as FieldFormatsGetConfigFn;
  const testValue = '4000';
  const mockTimezone = 'Browser';

  const fieldFormatsRegistry = new FieldFormatsRegistry();
  fieldFormatsRegistry.init(getConfig, {}, [BytesFormat, NumberFormat]);

  const formatMap = fieldFormatMapFactory(dataView, fieldFormatsRegistry, mockTimezone);

  it('should build field format map with entry per data view field', function () {
    expect(formatMap.has('field1')).to.be(true);
    expect(formatMap.has('field2')).to.be(true);
    expect(formatMap.has('field_not_in_index')).to.be(false);
  });

  it('should create custom FieldFormat for fields with configured field formatter', function () {
    expect(formatMap.get('field1')!.convert(testValue)).to.be('3.9KB');
  });

  it('should create default FieldFormat for fields with no field formatter', function () {
    expect(formatMap.get('field2')!.convert(testValue)).to.be('4,000');
  });
});
