/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormatFactory } from '../types';
import { getSuffixFormatter } from './suffix_formatter';

describe('suffix formatter', () => {
  it('should call nested formatter and apply suffix', () => {
    const convertMock = jest.fn((x) => x);
    const formatFactory = jest.fn(() => ({ convert: convertMock }));
    const SuffixFormatter = getSuffixFormatter((formatFactory as unknown) as FormatFactory);
    const nestedParams = { abc: 123 };
    const formatterInstance = new SuffixFormatter({
      unit: 'h',
      id: 'nestedFormatter',
      params: nestedParams,
    });

    const result = formatterInstance.convert(12345);

    expect(result).toEqual('12345/h');
    expect(convertMock).toHaveBeenCalledWith(12345);
    expect(formatFactory).toHaveBeenCalledWith({ id: 'nestedFormatter', params: nestedParams });
  });
});
