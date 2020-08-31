/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { entityToKql, entitiesToKql, addEntitiesToKql } from './add_entities_to_kql';

describe('add_entities_to_kql', () => {
  // Suppress warnings about invalid RISON as this is what we are testing
  /* eslint-disable no-console */
  const originalError = console.log;
  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalError;
  });

  describe('#entityToKql', () => {
    test('returns empty string with no entity names defined and an empty entity string', () => {
      const entity = entityToKql([], '');
      expect(entity).toEqual('');
    });

    test('returns empty string with no entity names defined and an entity defined', () => {
      const entity = entityToKql([], 'some-value');
      expect(entity).toEqual('');
    });

    test('returns empty string with a single entity name defined but an empty entity string as a single empty double quote', () => {
      const entity = entityToKql(['host.name'], '');
      expect(entity).toEqual('host.name: ""');
    });

    test('returns KQL with a single entity name defined', () => {
      const entity = entityToKql(['host.name'], 'some-value');
      expect(entity).toEqual('host.name: "some-value"');
    });

    test('returns empty string with two entity names defined but an empty entity string as a single empty double quote', () => {
      const entity = entityToKql(['source.ip', 'destination.ip'], '');
      expect(entity).toEqual('(source.ip: "" or destination.ip: "")');
    });

    test('returns KQL with two entity names defined', () => {
      const entity = entityToKql(['source.ip', 'destination.ip'], 'some-value');
      expect(entity).toEqual('(source.ip: "some-value" or destination.ip: "some-value")');
    });

    test('returns empty string with three entity names defined but an empty entity string as a single empty double quote', () => {
      const entity = entityToKql(['source.ip', 'destination.ip', 'process.name'], '');
      expect(entity).toEqual('(source.ip: "" or destination.ip: "" or process.name: "")');
    });

    test('returns KQL with three entity names defined', () => {
      const entity = entityToKql(['source.ip', 'destination.ip', 'process.name'], 'some-value');
      expect(entity).toEqual(
        '(source.ip: "some-value" or destination.ip: "some-value" or process.name: "some-value")'
      );
    });
  });

  describe('#entitiesToKql', () => {
    test('returns empty string with no entity names defined and empty entity strings', () => {
      const entity = entitiesToKql([], []);
      expect(entity).toEqual('');
    });

    test('returns empty string with a single entity name defined but an empty entity string as a single empty double quote', () => {
      const entity = entitiesToKql(['host.name'], ['']);
      expect(entity).toEqual('host.name: ""');
    });

    test('returns KQL with a single entity name defined', () => {
      const entity = entitiesToKql(['host.name'], ['some-value']);
      expect(entity).toEqual('host.name: "some-value"');
    });

    test('returns KQL with two entity names defined but one single value', () => {
      const entity = entitiesToKql(['source.ip', 'destination.ip'], ['some-value']);
      expect(entity).toEqual('(source.ip: "some-value" or destination.ip: "some-value")');
    });

    test('returns KQL with two entity values defined', () => {
      const entity = entitiesToKql(['host.name'], ['some-value-1', 'some-value-2']);
      expect(entity).toEqual('host.name: "some-value-1" or host.name: "some-value-2"');
    });

    test('returns KQL with two entity names and values defined', () => {
      const entity = entitiesToKql(
        ['destination.ip', 'source.ip'],
        ['some-value-1', 'some-value-2']
      );
      expect(entity).toEqual(
        '(destination.ip: "some-value-1" or source.ip: "some-value-1") or (destination.ip: "some-value-2" or source.ip: "some-value-2")'
      );
    });
  });

  describe('#addEntitiesToKql', () => {
    test('returns same kql if no entity names or values were defined', () => {
      const entity = addEntitiesToKql([], [], '(query:\'process.name : ""\',language:kuery)');
      expect(entity).toEqual('(language:kuery,query:\'process.name : ""\')');
    });

    test('returns kql with no "and" clause if the KQL query is not defined ', () => {
      const entity = addEntitiesToKql(['host.name'], ['host-1'], "(query:'',language:kuery)");
      expect(entity).toEqual('(language:kuery,query:\'(host.name: "host-1")\')');
    });

    test('returns kql with "and" clause separating the two if the KQL query is defined', () => {
      const entity = addEntitiesToKql(
        ['host.name'],
        ['host-1'],
        '(query:\'process.name : ""\',language:kuery)'
      );
      expect(entity).toEqual(
        '(language:kuery,query:\'(host.name: "host-1") and (process.name : "")\')'
      );
    });

    test('returns KQL that is not a Rison Object "as is" with no changes', () => {
      const entity = addEntitiesToKql(['host.name'], ['host-1'], 'I am some invalid value');
      expect(entity).toEqual('(language:kuery,query:\'(host.name: "host-1")\')');
    });

    test('returns kql with "and" clause separating the two with multiple entity names and a single value', () => {
      const entity = addEntitiesToKql(
        ['source.ip', 'destination.ip'],
        ['127.0.0.1'],
        '(query:\'process.name : ""\',language:kuery)'
      );
      expect(entity).toEqual(
        '(language:kuery,query:\'((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1")) and (process.name : "")\')'
      );
    });

    test('returns kql with "and" clause separating the two with multiple entity names and a multiple values', () => {
      const entity = addEntitiesToKql(
        ['source.ip', 'destination.ip'],
        ['127.0.0.1', '255.255.255.255'],
        '(query:\'process.name : ""\',language:kuery)'
      );
      expect(entity).toEqual(
        '(language:kuery,query:\'((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "255.255.255.255" or destination.ip: "255.255.255.255")) and (process.name : "")\')'
      );
    });

    test('returns kql with "and" clause separating the two with single entity name and multiple values', () => {
      const entity = addEntitiesToKql(
        ['host.name'],
        ['host-name-1', 'host-name-2'],
        '(query:\'process.name : ""\',language:kuery)'
      );
      expect(entity).toEqual(
        '(language:kuery,query:\'(host.name: "host-name-1" or host.name: "host-name-2") and (process.name : "")\')'
      );
    });

    test('returns kql query with a null appQuery', () => {
      const entity = addEntitiesToKql(['host.name'], ['host-1'], '!n');
      expect(entity).toEqual('(language:kuery,query:\'(host.name: "host-1")\')');
    });
  });
});
