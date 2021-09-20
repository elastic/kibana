/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListClient } from '../../../../../lists/server';

export const updateExceptionListItemImplementationMock: ExceptionListClient['updateExceptionListItem'] =
  async (listItem) => {
    return {
      _version: listItem._version || 'abc123',
      id: listItem.id || '123',
      comments: [],
      created_at: '11/11/2011T11:11:11.111',
      created_by: 'admin',
      description: listItem.description || '',
      entries: listItem.entries || [],
      item_id: listItem.itemId || '',
      list_id: 'endpoint_trusted_apps',
      meta: undefined,
      name: listItem.name || '',
      namespace_type: listItem.namespaceType || '',
      os_types: listItem.osTypes || '',
      tags: listItem.tags || [],
      type: 'simple',
      tie_breaker_id: '123',
      updated_at: '11/11/2011T11:11:11.111',
      updated_by: 'admin',
    };
  };
