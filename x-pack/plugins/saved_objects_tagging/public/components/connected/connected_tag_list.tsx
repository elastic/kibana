/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { SavedObject } from 'src/core/types';
import { TagListComponentProps } from '../../../../../../src/plugins/saved_objects_tagging_oss/public';
import { Tag } from '../../../common/types';
import { getObjectTags } from '../../utils';
import { TagList } from '../base';
import { ITagsCache } from '../../tags';

interface SavedObjectTagListProps {
  object: SavedObject;
  tags: Tag[];
}

const SavedObjectTagList: FC<SavedObjectTagListProps> = ({ object, tags }) => {
  const { tags: objectTags } = useMemo(() => {
    return getObjectTags(object, tags);
  }, [object, tags]);

  return <TagList tags={objectTags} />;
};

export const getConnectedTagListComponent = (cache: ITagsCache): FC<TagListComponentProps> => {
  return (props: TagListComponentProps) => {
    const tags = useObservable(cache.getState$(), []);
    return <SavedObjectTagList {...props} tags={tags} />;
  };
};
