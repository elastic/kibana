/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaggingApiComponents } from '../../../../src/plugins/saved_objects_tagging_oss/public';
import { ITagsCache } from './tags';
import { getConnectedTagListComponent } from './components/connected';

interface GetApiComponentsOptions {
  cache: ITagsCache;
}

export const getApiComponents = ({ cache }: GetApiComponentsOptions): TaggingApiComponents => {
  return {
    TagList: getConnectedTagListComponent(cache),
  };
};
