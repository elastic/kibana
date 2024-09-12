/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListType } from '@kbn/securitysolution-lists-common/api';
import type { Client as ListsClient } from '@kbn/securitysolution-lists-common/api/quickstart_client.gen';

/**
 * Efficiently turn an array of values into a value list in Kibana. Since the value list import API expects a file to be attached,
 * this function handles turning an array into a file attachment for the API and making the appropriate request structure.
 *
 * @param listsClient The lists client for accessing lists APIs through the CLI tool.
 * @param listName Name of the list to create. Should be unique, as this will become the list ID as well.
 * @param listFileType The file type suffix to use when sending the import list request. This should have no effect on the functionality of the created list,
 * it's effectively just metadata.
 * @param listItems Array of values to insert into the list.
 * @param listType Elasticsearch field type to use for the list values.
 * @returns Created list info
 */
export const importListItemsWrapper = ({
  listsClient,
  listName,
  listFileType,
  listItems,
  listType,
}: {
  listsClient: ListsClient;
  listName: string;
  listFileType: 'txt' | 'csv';
  listItems: unknown[];
  listType: ListType;
}) => {
  const blob = new Blob([listItems.join('\r\n')], { type: 'application/json' });
  const body = new FormData();
  body.append('file', blob, `${listName}.${listFileType}`);
  return listsClient.importListItems({ query: { type: listType }, attachment: body });
};
