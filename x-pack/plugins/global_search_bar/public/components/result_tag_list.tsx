/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/public';

const MAX_TAGS_TO_SHOW = 3;

const TagListWrapper: FC = ({ children }) => (
  <ul
    className="kbnSearchOption__tagsList"
    aria-label={i18n.translate('xpack.globalSearchBar.searchBar.optionTagListAriaLabel', {
      defaultMessage: 'Tags',
    })}
  >
    {children}
  </ul>
);

const buildListItem = ({ color, name, id }: Tag) => {
  return (
    <li className="kbnSearchOption__tagsListItem" key={id}>
      <EuiBadge color={color}>{name}</EuiBadge>
    </li>
  );
};

interface ResultTagListProps {
  tags: Tag[];
  searchTagIds: string[];
}

export const ResultTagList: FC<ResultTagListProps> = ({ tags, searchTagIds }) => {
  const showOverflow = tags.length > MAX_TAGS_TO_SHOW;

  if (!showOverflow) {
    return <TagListWrapper>{tags.map(buildListItem)}</TagListWrapper>;
  }

  // float searched tags to the start of the list, actual order doesn't matter
  tags.sort((a) => {
    if (searchTagIds.find((id) => id === a.id)) return -1;
    return 1;
  });

  const overflowList = tags.splice(MAX_TAGS_TO_SHOW);
  const overflowMessage = i18n.translate('xpack.globalSearchBar.searchbar.overflowTagsAriaLabel', {
    defaultMessage: '{n} more {n, plural, one {tag} other {tags}}: {tags}',
    values: {
      n: overflowList.length,
      // @ts-ignore-line
      tags: overflowList.map(({ name }) => name),
    },
  });

  return (
    <TagListWrapper>
      {tags.map(buildListItem)}
      <li className="kbnSearchOption__tagsListItem" aria-label={overflowMessage}>
        <EuiBadge title={overflowMessage}>+{overflowList.length}</EuiBadge>
      </li>
    </TagListWrapper>
  );
};
