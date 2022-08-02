/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '@kbn/core/public';
import { TagWithRelations } from '../../../common/types';

/**
 * Returns the url to use to redirect to the SavedObject management section with given tag
 * already selected in the query/filter bar.
 */
export const getTagConnectionsUrl = (tag: TagWithRelations, basePath: IBasePath) => {
  const query = encodeURIComponent(`tag:("${tag.name}")`);
  return basePath.prepend(`/app/management/kibana/objects?initialQuery=${query}`);
};
