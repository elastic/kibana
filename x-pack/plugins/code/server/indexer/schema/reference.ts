/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../../common/repository_utils';
import { RepositoryUri } from '../../../model';

export const ReferenceSchema = {
  category: {
    type: 'keyword',
  },
  location: {
    properties: {
      uri: {
        type: 'text',
      },
    },
  },
  symbol: {
    properties: {
      name: {
        type: 'text',
      },
      kind: {
        type: 'keyword',
      },
      location: {
        properties: {
          uri: {
            type: 'text',
          },
        },
      },
    },
  },
};

export const ReferenceIndexNamePrefix = `.code-reference`;
export const ReferenceIndexName = (repoUri: RepositoryUri) => {
  return `${ReferenceIndexNamePrefix}-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`;
};
