/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';

import {
  getFormattedComments,
  formatOperatingSystems,
  formatExceptionItemForUpdate,
  enrichNewExceptionItemsWithComments,
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  entryHasListType,
  entryHasNonEcsType,
  prepareExceptionItemsForBulkClose,
  lowercaseHashValues,
  getPrepopulatedEndpointException,
  defaultEndpointExceptionItems,
  getFileCodeSignature,
  getProcessCodeSignature,
  retrieveAlertOsTypes,
  filterIndexPatterns,
} from './helpers';
import { AlertData } from './types';
import {
  ListOperatorTypeEnum as OperatorTypeEnum,
  EntriesArray,
  OsTypeArray,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../lists/common/schemas/types/entry_match.mock';
import { getCommentsArrayMock } from '../../../../../lists/common/schemas/types/comment.mock';
import { fields } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { ENTRIES, OLD_DATE_RELATIVE_TO_DATE_NOW } from '../../../../../lists/common/constants.mock';
import { IFieldType, IIndexPattern } from 'src/plugins/data/common';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getMockIndexPattern = (): IIndexPattern => ({
  fields,
  id: '1234',
  title: 'logstash-*',
});

const mockEndpointFields = [
  {
    name: 'file.path.caseless',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
  },
  {
    name: 'file.Ext.code_signature.status',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    subType: { nested: { path: 'file.Ext.code_signature' } },
  },
];

const mockLinuxEndpointFields = [
  {
    name: 'file.path',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
  },
];

export const getEndpointField = (name: string) =>
  mockEndpointFields.find((field) => field.name === name) as IFieldType;

describe('Exception helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#filterIndexPatterns', () => {
    test('it returns index patterns without filtering if list type is "detection"', () => {
      const mockIndexPatterns = getMockIndexPattern();
      const output = filterIndexPatterns(mockIndexPatterns, 'detection', ['windows']);

      expect(output).toEqual(mockIndexPatterns);
    });

    test('it returns filtered index patterns if list type is "endpoint"', () => {
      const mockIndexPatterns = {
        ...getMockIndexPattern(),
        fields: [...fields, ...mockEndpointFields],
      };
      const output = filterIndexPatterns(mockIndexPatterns, 'endpoint', ['windows']);

      expect(output).toEqual({ ...getMockIndexPattern(), fields: [...mockEndpointFields] });
    });

    test('it returns filtered index patterns if list type is "endpoint" and os contains "linux"', () => {
      const mockIndexPatterns = {
        ...getMockIndexPattern(),
        fields: [...fields, ...mockLinuxEndpointFields],
      };
      const output = filterIndexPatterns(mockIndexPatterns, 'endpoint', ['linux']);

      expect(output).toEqual({ ...getMockIndexPattern(), fields: [...mockLinuxEndpointFields] });
    });
  });

  describe('#formatOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = formatOperatingSystems(['some os', 'some other os']);
      expect(result).toEqual('');
    });

    test('it returns formatted operating systems if multiple specified', () => {
      const result = formatOperatingSystems(['some tag', 'macos', 'some other tag', 'windows']);
      expect(result).toEqual('macOS, Windows');
    });
  });

  describe('#getFormattedComments', () => {
    test('it returns formatted comment object with username and timestamp', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      expect(result[0].username).toEqual('some user');
      expect(result[0].timestamp).toEqual('on Apr 20th 2020 @ 15:25:31');
    });

    test('it returns formatted timeline icon with comment users initial', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].timelineIcon as React.ReactElement);

      expect(wrapper.text()).toEqual('SU');
    });

    test('it returns comment text', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].children as React.ReactElement);

      expect(wrapper.text()).toEqual('some old comment');
    });
  });

  describe('#formatExceptionItemForUpdate', () => {
    test('it should return correct update fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const result = formatExceptionItemForUpdate(payload);
      const expected = {
        comments: [],
        description: 'some description',
        entries: ENTRIES,
        id: '1',
        item_id: 'endpoint_list_item',
        meta: {},
        name: 'some name',
        namespace_type: 'single',
        os_types: ['linux'],
        tags: ['user added string for a tag', 'malware'],
        type: 'simple',
      };
      expect(result).toEqual(expected);
    });
  });
  describe('#enrichExistingExceptionItemWithComments', () => {
    test('it should return exception item with comments stripped of "created_by", "created_at", "updated_by", "updated_at" fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const comments = [
        {
          comment: 'Im an existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '1',
        },
        {
          comment: 'Im another existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '2',
        },
        {
          comment: 'Im a new comment',
        },
      ];
      const result = enrichExistingExceptionItemWithComments(payload, comments);
      const expected = {
        ...getExceptionListItemSchemaMock(),
        comments: [
          {
            comment: 'Im an existing comment',
            id: '1',
          },
          {
            comment: 'Im another existing comment',
            id: '2',
          },
          {
            comment: 'Im a new comment',
          },
        ],
      };
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichNewExceptionItemsWithComments', () => {
    test('it should add comments to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add comments to multiple exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichExceptionItemsWithOS', () => {
    test('it should add an os to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const osTypes: OsTypeArray = ['windows'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows'],
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add multiple os tags to all exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const osTypes: OsTypeArray = ['windows', 'macos'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows', 'macos'],
        },
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows', 'macos'],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#retrieveAlertOsTypes', () => {
    test('it should retrieve os type if alert data is provided', () => {
      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        host: { os: { family: 'windows' } },
      };
      const result = retrieveAlertOsTypes(alertDataMock);
      const expected = ['windows'];
      expect(result).toEqual(expected);
    });

    test('it should return default os types if alert data is not provided', () => {
      const result = retrieveAlertOsTypes();
      const expected = ['windows', 'macos'];
      expect(result).toEqual(expected);
    });
  });

  describe('#entryHasListType', () => {
    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a list type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a list type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ type: OperatorTypeEnum.LIST }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasListType(payload);
      expect(result).toEqual(true);
    });
  });

  describe('#entryHasNonEcsType', () => {
    const mockEcsIndexPattern = {
      title: 'testIndex',
      fields: [
        {
          name: 'some.parentField',
        },
        {
          name: 'some.not.nested.field',
        },
        {
          name: 'nested.field',
        },
      ],
    } as IIndexPattern;

    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a non ecs type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a non ecs type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'some.nonEcsField' }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(true);
    });
  });

  describe('#prepareExceptionItemsForBulkClose', () => {
    test('it should return no exceptionw when passed in an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual([]);
    });

    test("should not make any updates when the exception entries don't contain 'event.'", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(payload);
    });

    test("should update entry fields when they start with 'event.'", () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.kind',
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.module',
            },
          ],
        },
      ];
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'signal.original_event.kind',
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'signal.original_event.module',
            },
          ],
        },
      ];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(expected);
    });
  });

  describe('#lowercaseHashValues', () => {
    test('it should return an empty array with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([]);
    });

    test('it should return all list items with entry hashes lowercased', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'DDDFFF' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'DDDFFF'] },
          ] as EntriesArray,
        },
      ];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'dddfff' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'dddfff'] },
          ] as EntriesArray,
        },
      ]);
    });
  });

  describe('getPrepopulatedItem', () => {
    const alertDataMock: AlertData = {
      '@timestamp': '1234567890',
      _id: 'test-id',
      file: { path: 'some-file-path', hash: { sha256: 'some-hash' } },
    };
    test('it returns prepopulated fields with empty values', () => {
      const prepopulatedItem = getPrepopulatedEndpointException({
        listId: 'some_id',
        ruleName: 'my rule',
        codeSignature: { subjectName: '', trusted: '' },
        eventCode: '',
        alertEcsData: { ...alertDataMock, file: { path: '', hash: { sha256: '' } } },
      });

      expect(prepopulatedItem.entries).toEqual([
        {
          entries: [
            { id: '123', field: 'subject_name', operator: 'included', type: 'match', value: '' },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: '' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        { id: '123', field: 'file.path.caseless', operator: 'included', type: 'match', value: '' },
        { id: '123', field: 'file.hash.sha256', operator: 'included', type: 'match', value: '' },
        { id: '123', field: 'event.code', operator: 'included', type: 'match', value: '' },
      ]);
    });

    test('it returns prepopulated items with actual values', () => {
      const prepopulatedItem = getPrepopulatedEndpointException({
        listId: 'some_id',
        ruleName: 'my rule',
        codeSignature: { subjectName: 'someSubjectName', trusted: 'false' },
        eventCode: 'some-event-code',
        alertEcsData: alertDataMock,
      });

      expect(prepopulatedItem.entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'someSubjectName',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some-file-path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some-hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some-event-code',
        },
      ]);
    });
  });

  describe('getFileCodeSignature', () => {
    test('it works when file.Ext.code_signature is an object', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: {
              subject_name: 'some_subject',
              trusted: 'false',
            },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: 'some_subject', trusted: 'false' }]);
    });

    test('it works when file.Ext.code_signature is nested type', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
        },
      });

      expect(codeSignatures).toEqual([
        { subjectName: 'some_subject', trusted: 'false' },
        {
          subjectName: 'some_subject_2',
          trusted: 'true',
        },
      ]);
    });

    test('it returns default when file.Ext.code_signatures values are empty', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: { subject_name: '', trusted: '' },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures is empty array', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: [],
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures does not exist', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });
  });

  describe('getProcessCodeSignature', () => {
    test('it works when file.Ext.code_signature is an object', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: {
              subject_name: 'some_subject',
              trusted: 'false',
            },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: 'some_subject', trusted: 'false' }]);
    });

    test('it works when file.Ext.code_signature is nested type', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
        },
      });

      expect(codeSignatures).toEqual([
        { subjectName: 'some_subject', trusted: 'false' },
        {
          subjectName: 'some_subject_2',
          trusted: 'true',
        },
      ]);
    });

    test('it returns default when file.Ext.code_signatures values are empty', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: { subject_name: '', trusted: '' },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures is empty array', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: [],
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures does not exist', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });
  });

  describe('defaultEndpointExceptionItems', () => {
    test('it should return pre-populated Endpoint items for non-specified event code', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        file: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
          path: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        event: {
          code: 'some event code',
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some event code',
        },
      ]);
      expect(defaultItems[1].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject_2',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'true' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some event code',
        },
      ]);
    });

    test('it should return pre-populated ransomware items for event code `ransomware`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
          executable: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        Ransomware: {
          feature: 'some ransomware feature',
        },
        event: {
          code: 'ransomware',
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'Ransomware.feature',
          operator: 'included',
          type: 'match',
          value: 'some ransomware feature',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'ransomware',
        },
      ]);
      expect(defaultItems[1].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject_2',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'true' },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'Ransomware.feature',
          operator: 'included',
          type: 'match',
          value: 'some ransomware feature',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'ransomware',
        },
      ]);
    });

    test('it should return pre-populated memory signature items for event code `memory_signature`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: 'some name',
          executable: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'signature',
        },
        event: {
          code: 'memory_signature',
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'signature',
          id: '123',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
          id: '123',
        },
        {
          field: 'process.name.caseless',
          operator: 'included',
          type: 'match',
          value: 'some name',
          id: '123',
        },
        {
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
          id: '123',
        },
      ]);
    });

    test('it should return pre-populated memory shellcode items for event code `malicious_thread`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: 'some name',
          executable: 'some file path',
          Ext: {
            token: {
              integrity_level_name: 'high',
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'shellcode_thread',
          self_injection: true,
        },
        event: {
          code: 'malicious_thread',
        },
        Target: {
          process: {
            thread: {
              Ext: {
                start_address_allocation_offset: 0,
                start_address_bytes_disasm_hash: 'a disam hash',
                start_address_details: {
                  allocation_type: 'PRIVATE',
                  allocation_size: 4000,
                  region_size: 4000,
                  region_protection: 'RWX',
                  memory_pe: {
                    imphash: 'a hash',
                  },
                },
              },
            },
          },
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'shellcode_thread',
          id: '123',
        },
        {
          field: 'Memory_protection.self_injection',
          operator: 'included',
          type: 'match',
          value: 'true',
          id: '123',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
          id: '123',
        },
        {
          field: 'process.name.caseless',
          operator: 'included',
          type: 'match',
          value: 'some name',
          id: '123',
        },
        {
          field: 'process.Ext.token.integrity_level_name',
          operator: 'included',
          type: 'match',
          value: 'high',
          id: '123',
        },
        {
          field: 'Target.process.thread.Ext.start_address_details',
          type: 'nested',
          entries: [
            {
              field: 'allocation_type',
              operator: 'included',
              type: 'match',
              value: 'PRIVATE',
              id: '123',
            },
            {
              field: 'allocation_size',
              operator: 'included',
              type: 'match',
              value: '4000',
              id: '123',
            },
            { field: 'region_size', operator: 'included', type: 'match', value: '4000', id: '123' },
            {
              field: 'region_protection',
              operator: 'included',
              type: 'match',
              value: 'RWX',
              id: '123',
            },
            {
              field: 'memory_pe.imphash',
              operator: 'included',
              type: 'match',
              value: 'a hash',
              id: '123',
            },
          ],
          id: '123',
        },
      ]);
    });
  });
});
