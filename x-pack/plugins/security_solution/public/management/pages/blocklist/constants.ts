/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ExceptionListType,
  CreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_BLOCKLISTS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';
import { OperatingSystem } from '@kbn/securitysolution-utils';

export const BLOCKLISTS_LIST_TYPE: ExceptionListType = ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS;

export const BLOCKLISTS_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_BLOCKLISTS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
  list_id: ENDPOINT_BLOCKLISTS_LIST_ID,
  type: BLOCKLISTS_LIST_TYPE,
};

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  'item_id',
  `entries.value`,
  `entries.entries.value`,
  `comments.comment`,
];

export const blocklistOperatorFieldTestCases = [
  {
    os: OperatingSystem.LINUX,
    field: 'file.path',
    fieldText: 'Path, ',
    osText: 'Linux, ',
    isMulti: false,
  },
  {
    os: OperatingSystem.LINUX,
    field: 'file.hash.*',
    fieldText: 'Hash, ',
    osText: 'Linux, ',
    isMulti: false,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.path.caseless',
    fieldText: 'Path, ',
    osText: 'Windows, ',
    isMulti: false,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.hash.*',
    fieldText: 'Hash, ',
    osText: 'Windows, ',
    isMulti: false,
  },
  {
    os: OperatingSystem.WINDOWS,
    field: 'file.Ext.code_signature',
    fieldText: 'Signature, ',
    osText: 'Windows, ',
    isMulti: true,
  },
  {
    os: OperatingSystem.MAC,
    field: 'file.path.caseless',
    fieldText: 'Path, ',
    osText: 'Mac, ',
    isMulti: false,
  },
  {
    os: OperatingSystem.MAC,
    field: 'file.hash.*',
    fieldText: 'Hash, ',
    osText: 'Mac, ',
    isMulti: false,
  },
];
