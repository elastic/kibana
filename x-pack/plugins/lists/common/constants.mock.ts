/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EntriesArray } from './schemas/types';

export const DATE_NOW = '2020-04-20T15:25:31.830Z';
export const USER = 'some user';
export const LIST_INDEX = '.lists';
export const LIST_ITEM_INDEX = '.items';
export const NAME = 'some name';
export const DESCRIPTION = 'some description';
export const LIST_ID = 'some-list-id';
export const LIST_ITEM_ID = 'some-list-item-id';
export const TIE_BREAKER = '6a76b69d-80df-4ab2-8c3e-85f466b06a0e';
export const TIE_BREAKERS = [
  '21530991-4051-46ec-bc35-2afa09a1b0b5',
  '3c662054-ae37-4aa9-9936-3e8e2ea26775',
  '60e49a20-3a23-48b6-8bf9-ed5e3b70f7a0',
  '38814080-a40f-4358-992a-3b875f9b7dec',
  '29fa61be-aaaf-411c-a78a-7059e3f723f1',
  '9c19c959-cb9d-4cd2-99e4-1ea2baf0ef0e',
  'd409308c-f94b-4b3a-8234-bbd7a80c9140',
  '87824c99-cd83-45c4-8aa6-4ad95dfea62c',
  '7b940c17-9355-479f-b882-f3e575718f79',
  '5983ad0c-4ef4-4fa0-8308-80ab9ecc4f74',
];
export const META = {};
export const TYPE = 'ip';
export const VALUE = '127.0.0.1';
export const VALUE_2 = '255.255.255';
export const NAMESPACE_TYPE = 'single';

// Exception List specific
export const ID = 'uuid_here';
export const ITEM_ID = 'some-list-item-id';
export const ENDPOINT_TYPE = 'endpoint';
export const FIELD = 'host.name';
export const OPERATOR = 'included';
export const ENTRY_VALUE = 'some host name';
export const MATCH = 'match';
export const MATCH_ANY = 'match_any';
export const MAX_IMPORT_PAYLOAD_BYTES = 40000000;
export const IMPORT_BUFFER_SIZE = 1000;
export const LIST = 'list';
export const EXISTS = 'exists';
export const NESTED = 'nested';
export const ENTRIES: EntriesArray = [
  {
    entries: [{ field: 'nested.field', operator: 'included', type: 'match', value: 'some value' }],
    field: 'some.parentField',
    type: 'nested',
  },
  { field: 'some.not.nested.field', operator: 'included', type: 'match', value: 'some value' },
];
export const ITEM_TYPE = 'simple';
export const _TAGS = [];
export const TAGS = [];
export const COMMENTS = [];
