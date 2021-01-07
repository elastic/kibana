/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { Tag } from '../../../common';
import { testSubjFriendly } from '../../utils';

export interface TagSearchBarOptionProps {
  tag: Tag;
}

export const TagSearchBarOption: FC<TagSearchBarOptionProps> = ({ tag }) => {
  const { name, color } = tag;
  return (
    <EuiHealth color={color} data-test-subj={`tag-searchbar-option-${testSubjFriendly(name)}`}>
      <span>
        <EuiText>{name}</EuiText>
      </span>
    </EuiHealth>
  );
};
