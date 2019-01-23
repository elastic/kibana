/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { buildGlobalQuery } from './helpers';

const cleanUpKqlQuery = (str: string) => str.replace(/\n/g, '').replace(/\s\s+/g, ' ');

describe('Build KQL Query', () => {
  test('Buld KQL query with one data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 )'
    );
  });

  test('Buld KQL query with two data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 2);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 ) or ( name : Provider 2 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 )'
    );
  });

  test('Buld KQL query with one data provider and one and', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    dataProviders[0].and = mockDataProviders.slice(1, 2);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 2)'
    );
  });

  test('Buld KQL query with two data provider and mutiple and', () => {
    const dataProviders = mockDataProviders.slice(0, 2);
    dataProviders[0].and = mockDataProviders.slice(2, 4);
    dataProviders[1].and = mockDataProviders.slice(4, 5);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 3 and name : Provider 4) or ( name : Provider 2 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 5)'
    );
  });
});
