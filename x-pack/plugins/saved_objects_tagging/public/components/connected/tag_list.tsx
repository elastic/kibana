/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SavedObject } from '../../../../../../src/core/types/saved_objects';
import type { Tag } from '../../../../../../src/plugins/saved_objects_tagging_oss/common/types';
import type {
  ITagsCache,
  TagListComponentProps,
} from '../../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import { byNameTagSorter, getObjectTags } from '../../utils';
import { TagList } from '../base/tag_list';

interface SavedObjectTagListProps {
  object: SavedObject;
  tags: Tag[];
}

const SavedObjectTagList: FC<SavedObjectTagListProps> = ({ object, tags: allTags }) => {
  const objectTags = useMemo(() => {
    const { tags } = getObjectTags(object, allTags);
    tags.sort(byNameTagSorter);
    return tags;
  }, [object, allTags]);

  return <TagList tags={objectTags} />;
};

interface GetConnectedTagListOptions {
  cache: ITagsCache;
}

export const getConnectedTagListComponent = ({
  cache,
}: GetConnectedTagListOptions): FC<TagListComponentProps> => {
  return (props: TagListComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
    return <SavedObjectTagList {...props} tags={tags} />;
  };
};
