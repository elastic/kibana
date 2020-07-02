/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useTags } from '../../context';
import { Tag as TagUi } from '../../components/tag';

export interface TagProps {
  id: string;
}

export const Tag: React.FC<TagProps> = React.memo(({ id }) => {
  const { manager } = useTags();
  const tag = manager!.useTag(id);

  if (!tag) return null;

  return <TagUi tag={tag} />;
});
