/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { replaceStringWithParams } from './formatting_utils';
import { loggerMock } from '@kbn/logging-mocks';

describe('replaceStringWithParams', () => {
  const logger = loggerMock.create();

  it('replaces params', () => {
    const result = replaceStringWithParams(
      '${homePageUrl}',
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('returns empty value in case no param', () => {
    const result = replaceStringWithParams('${homePageUrl}', {}, logger);

    expect(result).toEqual('');
  });

  it('works on objects', () => {
    const result = replaceStringWithParams(
      { key: 'Basic ${homePageUrl}' },
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual({ key: 'Basic https://elastic.co' });
  });

  it('works on arrays', () => {
    const result = replaceStringWithParams(
      ['Basic ${homePageUrl}'],
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual(['Basic https://elastic.co']);
  });

  it('works on multiple', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl} ${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });

  it('works with default value', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl:https://elastic.co} ${homePageUrl1}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });
});
