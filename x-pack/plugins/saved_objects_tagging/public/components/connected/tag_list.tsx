/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { SavedObject } from '@kbn/core/types';
import { TagListComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { Tag } from '../../../common/types';
import { getObjectTags } from '../../utils';
import { TagList } from '../base';
import { ITagsCache } from '../../services';
import { byNameTagSorter } from '../../utils';

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
