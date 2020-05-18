/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getFieldNames,
  getAllCategoryFieldNames,
  getOperatorLabels,
  getExceptionOperatorSelect,
  getExceptionOperatorFromSelect,
  getOperatorType,
  getEntryValue,
  formatFieldValues,
  getUpdatedEntryFromOperator,
} from './helpers';
import { mockBrowserFields } from '../common/containers/source/mock';
import {
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  existsOperator,
  doesNotExistOperator,
  isInListOperator,
  isNotInListOperator,
} from './operators';
import { ExceptionItemEntry, OperatorType } from './types';

describe('exceptions helpers', () => {
  describe('#getOperatorLabels', () => {
    test('returns all fields as enabled when type is not "endgame"', () => {
      const result = getOperatorLabels('siem');

      expect(result).toEqual([
        { disabled: false, text: 'is', value: 'is' },
        { disabled: false, text: 'is not', value: 'is_not' },
        { disabled: false, text: 'is one of', value: 'is_one_of' },
        { disabled: false, text: 'is not one of', value: 'is_not_one_of' },
        { disabled: false, text: 'exists', value: 'exists' },
        { disabled: false, text: 'does not exist', value: 'does_not_exist' },
        { disabled: false, text: 'is in list', value: 'is_in_list' },
        { disabled: false, text: 'is not in list', value: 'is_not_in_list' },
      ]);
    });

    test('returns only "is" operator as enabled when type is "endgame"', () => {
      const result = getOperatorLabels('endgame');

      expect(result).toEqual([
        { disabled: false, text: 'is', value: 'is' },
        { disabled: true, text: 'is not', value: 'is_not' },
        { disabled: true, text: 'is one of', value: 'is_one_of' },
        { disabled: true, text: 'is not one of', value: 'is_not_one_of' },
        { disabled: true, text: 'exists', value: 'exists' },
        { disabled: true, text: 'does not exist', value: 'does_not_exist' },
        { disabled: true, text: 'is in list', value: 'is_in_list' },
        { disabled: true, text: 'is not in list', value: 'is_not_in_list' },
      ]);
    });
  });

  describe('#getFieldNames', () => {
    test('returns empty array if "category.fields" has no properties', () => {
      const result = getFieldNames({ fields: {} });

      expect(result).toHaveLength(0);
    });

    test('returns array of fields', () => {
      const categoryFields = {
        fields: {
          'agent.ephemeral_id': {
            aggregatable: true,
            category: 'agent',
            description:
              'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
            example: '8a4f500f',
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'agent.ephemeral_id',
            searchable: true,
            type: 'string',
          },
          'agent.hostname': {
            aggregatable: true,
            category: 'agent',
            description: null,
            example: null,
            format: '',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: 'agent.hostname',
            searchable: true,
            type: 'string',
          },
        },
      };

      const result = getFieldNames(categoryFields);

      expect(result).toEqual(['agent.ephemeral_id', 'agent.hostname']);
    });
  });

  describe('#getAllCategoryFieldNames', () => {
    test('returns all formatted fields when "listType" is not "endgame"', () => {
      const result = getAllCategoryFieldNames(mockBrowserFields, 'siem');

      expect(result).toEqual([
        { label: 'agent.ephemeral_id' },
        { label: 'agent.hostname' },
        { label: 'agent.id' },
        { label: 'agent.name' },
        { label: 'auditd.data.a0' },
        { label: 'auditd.data.a1' },
        { label: 'auditd.data.a2' },
        { label: '@timestamp' },
        { label: 'client.address' },
        { label: 'client.bytes' },
        { label: 'client.domain' },
        { label: 'client.geo.country_iso_code' },
        { label: 'cloud.account.id' },
        { label: 'cloud.availability_zone' },
        { label: 'container.id' },
        { label: 'container.image.name' },
        { label: 'container.image.tag' },
        { label: 'destination.address' },
        { label: 'destination.bytes' },
        { label: 'destination.domain' },
        { label: 'destination.ip' },
        { label: 'destination.port' },
        { label: 'event.end' },
        { label: 'source.ip' },
        { label: 'source.port' },
      ]);
    });

    test('returns select formatted fields when "listType" is "endgame"', () => {
      const result = getAllCategoryFieldNames(mockBrowserFields, 'endgame');

      expect(result).toEqual([
        { label: 'endgame.sha256' },
        { label: 'endgame.signature_signer' },
        { label: 'file.path' },
      ]);
    });
  });

  describe('#getExceptionOperatorSelect', () => {
    test('it returns "isOperator" when "operator" is "included" and operator type is "match"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isOperator);
    });

    test('it returns "isNotOperator" when "operator" is "excluded" and operator type is "match"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match: 'rock01',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isNotOperator);
    });

    test('it returns "isOneOfOperator" when "operator" is "included" and operator type is "match_any"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match_any: ['rock01'],
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isOneOfOperator);
    });

    test('it returns "isNotOneOfOperator" when "operator" is "excluded" and operator type is "match_any"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match_any: ['rock01'],
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isNotOneOfOperator);
    });

    test('it returns "existsOperator" when "operator" is "included" and no operator type is provided', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(existsOperator);
    });

    test('it returns "doesNotExistsOperator" when "operator" is "excluded" and no operator type is provided', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(doesNotExistOperator);
    });

    test('it returns "isInList" when "operator" is "included" and operator type is "list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        list: '',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isInListOperator);
    });

    test('it returns "isNotInList" when "operator" is "excluded" and operator type is "list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        list: '',
      };
      const result = getExceptionOperatorSelect(entry);

      expect(result).toEqual(isNotInListOperator);
    });
  });

  describe('getExceptionOperatorFromSelect', () => {
    test('it returns "isOperator" when operator selection is "is"', () => {
      const result = getExceptionOperatorFromSelect('is');

      expect(result).toEqual(isOperator);
    });

    test('it returns "isNotOperator" when operator selection is "is_not"', () => {
      const result = getExceptionOperatorFromSelect('is_not');

      expect(result).toEqual(isNotOperator);
    });

    test('it returns "isOneOfOperator" when operator selection is "is_one_of"', () => {
      const result = getExceptionOperatorFromSelect('is_one_of');

      expect(result).toEqual(isOneOfOperator);
    });

    test('it returns "isNotOneOfOperator" when operator selection is "is_not_one_of"', () => {
      const result = getExceptionOperatorFromSelect('is_not_one_of');

      expect(result).toEqual(isNotOneOfOperator);
    });

    test('it returns "isInListOperator" when operator selection is "is_in_list"', () => {
      const result = getExceptionOperatorFromSelect('is_in_list');

      expect(result).toEqual(isInListOperator);
    });

    test('it returns "isNotInListOperator" when operator selection is "is_not_in_list"', () => {
      const result = getExceptionOperatorFromSelect('is_not_in_list');

      expect(result).toEqual(isNotInListOperator);
    });

    test('it returns "existsOperator" when operator selection is "exists"', () => {
      const result = getExceptionOperatorFromSelect('exists');

      expect(result).toEqual(existsOperator);
    });

    test('it returns "doesNotExistOperator" when operator selection is "does_not_exist"', () => {
      const result = getExceptionOperatorFromSelect('does_not_exist');

      expect(result).toEqual(doesNotExistOperator);
    });
  });

  describe('#getOperatorType', () => {
    test('it returns "match" when entry includes key "match"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getOperatorType(entry);

      expect(result).toEqual(OperatorType.PHRASE);
    });

    test('it returns "match_any" when entry includes key "match_any"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match_any: ['rock01'],
      };
      const result = getOperatorType(entry);

      expect(result).toEqual(OperatorType.PHRASES);
    });

    test('it returns "list" when entry includes key "list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        list: '123',
      };
      const result = getOperatorType(entry);

      expect(result).toEqual(OperatorType.LIST);
    });

    test('it returns "exists" when no operator type key exists', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
      };
      const result = getOperatorType(entry);

      expect(result).toEqual(OperatorType.EXISTS);
    });
  });

  describe('#getEntryValue', () => {
    test('returns value when operator type is "match"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getEntryValue(entry);

      expect(result).toEqual('rock01');
    });

    test('returns value when operator type is "match_any"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match_any: ['rock01'],
      };
      const result = getEntryValue(entry);

      expect(result).toEqual(['rock01']);
    });

    test('returns value when operator type is "list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        list: '123',
      };
      const result = getEntryValue(entry);

      expect(result).toEqual('123');
    });

    test('returns empty string when operator type is "exists"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
      };
      const result = getEntryValue(entry);

      expect(result).toEqual('');
    });
  });

  describe('#formatFieldValues', () => {
    test('it returns an empty array when value is null', () => {
      const result = formatFieldValues(null);

      expect(result).toEqual([]);
    });

    test('it returns array with single formatted value when string passed in', () => {
      const result = formatFieldValues('rock01');

      expect(result).toEqual([{ label: 'rock01' }]);
    });

    test('it returns an empty array when value is empty string', () => {
      const result = formatFieldValues('');

      expect(result).toEqual([]);
    });

    test('it returns an array with formatted items when array of strings passed in', () => {
      const result = formatFieldValues(['rock01', 'someHost']);

      expect(result).toEqual([{ label: 'rock01' }, { label: 'someHost' }]);
    });

    test('it returns an empty array when value is empty array', () => {
      const result = formatFieldValues([]);

      expect(result).toEqual([]);
    });
  });

  describe('#getUpdatedEntryFromOperator', () => {
    test('it returns existing field value if "selectedOperator" is the same as "entry" operator type', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_not' });

      expect(result).toEqual({ field: 'host.name', operator: 'excluded', match: 'rock01' });
    });

    test('it returns entry with "operator" of "included" and field value of empty string default when "selectedOperator" is "is"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match_any: ['rock01'],
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is' });

      expect(result).toEqual({ field: 'host.name', operator: 'included', match: '' });
    });

    test('it returns entry with "operator" of "excluded" and field value of empty string default when "selectedOperator" is "is_not"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match_any: ['rock01'],
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_not' });

      expect(result).toEqual({ field: 'host.name', operator: 'excluded', match: '' });
    });

    test('it returns entry with "operator" of "included" and field value of empty array default when "selectedOperator" is "is_one_of"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_one_of' });

      expect(result).toEqual({ field: 'host.name', operator: 'included', match_any: [] });
    });

    test('it returns entry with "operator" of "excluded" and field value of empty array default when "selectedOperator" is "is_not_one_of"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_not_one_of' });

      expect(result).toEqual({ field: 'host.name', operator: 'excluded', match_any: [] });
    });

    test('it returns entry with "operator" of "included" and field value of empty string default when "selectedOperator" is "is_in_list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_in_list' });

      expect(result).toEqual({ field: 'host.name', operator: 'included', list: '' });
    });

    test('it returns entry with "operator" of "excluded" and field value of empty string default when "selectedOperator" is "is_not_in_list"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'is_not_in_list' });

      expect(result).toEqual({ field: 'host.name', operator: 'excluded', list: '' });
    });

    test('it returns entry with "operator" of "included" and no operator type when "selectedOperator" is "exists"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'included',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'exists' });

      expect(result).toEqual({ field: 'host.name', operator: 'included' });
    });

    test('it returns entry with "operator" of "excluded" and no operator type when "selectedOperator" is "does_not_exist"', () => {
      const entry: ExceptionItemEntry = {
        field: 'host.name',
        operator: 'excluded',
        match: 'rock01',
      };
      const result = getUpdatedEntryFromOperator({ entry, selectedOperator: 'does_not_exist' });

      expect(result).toEqual({ field: 'host.name', operator: 'excluded' });
    });
  });
});
