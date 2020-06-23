/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface GetListIndexOptions {
  spaceId: string;
  listsIndexName: string;
}

export const getListIndex = ({ spaceId, listsIndexName }: GetListIndexOptions): string =>
  `${listsIndexName}-${spaceId}`;
