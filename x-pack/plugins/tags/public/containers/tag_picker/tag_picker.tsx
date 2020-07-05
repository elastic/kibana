/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import {
  TagPicker as TagPickerUi,
  TagPickerProps as TagPickerPropsUi,
} from '../../components/tag_picker';
import { useTags } from '../../context';

export type TagPickerProps = Omit<TagPickerPropsUi, 'tags'>;

export const TagPicker: React.FC<TagPickerProps> = (props) => {
  const { manager } = useTags();
  const initializing = manager!.useInitializing();
  const tags = manager!.useTags();
  const rawTags = useMemo(
    () =>
      Object.values(tags)
        .map(({ data }) => data)
        .sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1)),
    [tags]
  );

  if (initializing) return null;

  if (!rawTags.length) {
    return <div>Not tags setup! Go to mangement app to add tags.</div>;
  }

  return <TagPickerUi {...props} tags={rawTags} />;
};
