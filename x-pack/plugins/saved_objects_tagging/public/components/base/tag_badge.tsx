/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiBadge } from '@elastic/eui';
import { Tag, TagAttributes } from '../../../common/types';

export interface TagBadgeProps {
  tag: Tag | TagAttributes;
}

/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export const TagBadge: FC<TagBadgeProps> = ({ tag }) => {
  return <EuiBadge color={tag.color}>{tag.name}</EuiBadge>;
};
