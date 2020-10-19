/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { TagSelectorComponentProps } from '../../../../../../src/plugins/saved_objects_tagging_oss/public';
import { TagSelector } from '../base';
import { ITagsCache } from '../../tags';

export const getConnectedTagSelectorComponent = (
  cache: ITagsCache
): FC<TagSelectorComponentProps> => {
  return (props: TagSelectorComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
    return <TagSelector {...props} tags={tags} />;
  };
};
