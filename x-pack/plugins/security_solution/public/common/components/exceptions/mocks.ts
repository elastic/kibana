/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Operator,
  ExceptionListItemSchema,
  ExceptionEntry,
  NestedExceptionEntry,
  FormattedEntry,
} from './types';
import { ExceptionList } from '../../../lists_plugin_deps';

export const getExceptionListMock = (): ExceptionList => ({
  id: '5b543420',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  list_id: 'test-exception',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  namespace_type: 'single',
  name: '',
  description: 'This is a description',
  _tags: ['os:windows'],
  tags: [],
  type: 'endpoint',
  meta: {},
  totalItems: 0,
});

export const getExceptionItemEntryMock = (): ExceptionEntry => ({
  field: 'actingProcess.file.signer',
  type: 'match',
  operator: Operator.INCLUSION,
  value: 'Elastic, N.V.',
});

export const getNestedExceptionItemEntryMock = (): NestedExceptionEntry => ({
  field: 'actingProcess.file.signer',
  type: 'nested',
  entries: [{ ...getExceptionItemEntryMock() }],
});

export const getFormattedEntryMock = (isNested = false): FormattedEntry => ({
  fieldName: 'host.name',
  operator: 'is',
  value: 'some name',
  isNested,
});

export const getExceptionItemMock = (): ExceptionListItemSchema => ({
  id: 'uuid_here',
  item_id: 'item-id',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  list_id: 'test-exception',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  namespace_type: 'single',
  name: '',
  description: 'This is a description',
  comment: [
    {
      user: 'user_name',
      timestamp: '2020-04-23T00:19:13.289Z',
      comment: 'Comment goes here',
    },
  ],
  _tags: ['os:windows'],
  tags: [],
  type: 'simple',
  entries: [
    {
      field: 'actingProcess.file.signer',
      type: 'match',
      operator: Operator.INCLUSION,
      value: 'Elastic, N.V.',
    },
    {
      field: 'host.name',
      type: 'match',
      operator: Operator.EXCLUSION,
      value: 'Global Signer',
    },
    {
      field: 'file.signature',
      type: 'nested',
      entries: [
        {
          field: 'signer',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'Evil',
        },
        {
          field: 'trusted',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'true',
        },
      ],
    },
  ],
});
