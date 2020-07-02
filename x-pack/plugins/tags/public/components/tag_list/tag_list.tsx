/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Tag, TagView } from '../tag/tag';

export interface Props {
  tags: TagView[];
}

export const TagList: React.FC<Props> = ({ tags }) => {
  return (
    <>
      {tags.map((tag) => (
        <Tag tag={tag} />
      ))}
    </>
  );
};
