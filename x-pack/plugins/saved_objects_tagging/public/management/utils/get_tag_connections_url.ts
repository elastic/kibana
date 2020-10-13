/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IBasePath } from 'src/core/public';
import { TagWithRelations } from '../../../common/types';

export const getTagConnectionsUrl = (tag: TagWithRelations, basePath: IBasePath) => {
  const query = encodeURIComponent(`tag:(${tag.name})`);
  return basePath.prepend(`/app/management/kibana/objects?initialQuery=${query}`);
};
