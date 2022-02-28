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

export const createExceptionLists = (lists: Array<[ExceptionList, string]>) =>
  Cypress.Promise.all(
    lists.map(([list, listId]) =>
      cy.request({
        method: 'POST',
        url: 'api/exception_lists',
        body: {
          list_id: listId ?? list.list_id,
          description: list.description,
          name: list.name,
          type: list.type,
        },
        headers: { 'kbn-xsrf': 'cypress-creds' },
        failOnStatusCode: false,
      })
    )
  );

export const createExceptionListItem = (
  exceptionListItemId: string,
  exceptionListItem?: ExceptionListItem
) =>
  cy.request({
    method: 'POST',
    url: '/api/exception_lists/items',
    body: {
      list_id: exceptionListItem?.list_id ?? exceptionListItemId,
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

export const deleteAllExceptions = () => {
  const kibanaIndexUrl = `${Cypress.env('ELASTICSEARCH_URL')}/.kibana_\*`;

  cy.request({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query`,
    body: {
      query: {
        exists: { field: 'exception-list' },
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

  cy.request({
    method: 'POST',
    url: `${kibanaIndexUrl}/_delete_by_query`,
    body: {
      query: {
        exists: { field: 'exception-list-agnostic' },
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};
