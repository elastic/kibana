/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionList, ExceptionListItem } from '../../objects/exception';

export const createExceptionList = (
  exceptionList: ExceptionList,
  exceptionListId = 'exception_list_testing'
) =>
  cy.request({
    method: 'POST',
    url: 'api/exception_lists',
    body: {
      list_id: exceptionListId != null ? exceptionListId : exceptionList.list_id,
      description: exceptionList.description,
      name: exceptionList.name,
      type: exceptionList.type,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const createExceptionListItem = (
  exceptionListId: string,
  exceptionListItem?: ExceptionListItem
) =>
  cy.request({
    method: 'POST',
    url: '/api/exception_lists/items',
    body: {
      list_id: exceptionListItem?.list_id ?? exceptionListId,
      item_id: exceptionListItem?.item_id ?? 'simple_list_item',
      tags: exceptionListItem?.tags ?? ['user added string for a tag', 'malware'],
      type: exceptionListItem?.type ?? 'simple',
      description: exceptionListItem?.description ?? 'This is a sample endpoint type exception',
      name: exceptionListItem?.name ?? 'Sample Exception List Item',
      entries: exceptionListItem?.entries ?? [
        {
          field: 'actingProcess.file.signer',
          operator: 'excluded',
          type: 'exists',
        },
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host', 'another host'],
        },
      ],
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const updateExceptionListItem = (
  exceptionListItemId: string,
  exceptionListItemUpdate?: Partial<ExceptionListItem>
) =>
  cy.request({
    method: 'PUT',
    url: '/api/exception_lists/items',
    body: {
      item_id: exceptionListItemId,
      ...exceptionListItemUpdate,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const deleteExceptionList = (listId: string, namespaceType: string) =>
  cy.request({
    method: 'DELETE',
    url: `/api/exception_lists?list_id=${listId}&namespace_type=${namespaceType}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
