/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { getId } from '../../lib/get_id';
import { Tag } from '../tag';
import { TagSpec } from '../../lib/tag';

export interface Props {
  /**
   * list of tags to display in the list
   */
  tags?: string[];
  /**
   * choose EuiHealth or EuiBadge
   */
  tagType?: 'health' | 'badge';
  /**
   * gets the tag from the tag registry
   */
  getTag: (tagName: string) => TagSpec;
}

export const TagList: FunctionComponent<Props> = ({ tags = [], tagType = 'health', getTag }) => (
  <Fragment>
    {tags.length
      ? tags.map((tag: string) => {
          const { color, name } = getTag(tag);
          const id = getId('tag');
          return <Tag key={id} color={color} name={name} type={tagType} />;
        })
      : null}
  </Fragment>
);

TagList.propTypes = {
  tags: PropTypes.array,
  tagType: PropTypes.oneOf(['health', 'badge']),
  getTag: PropTypes.func.isRequired,
};
