/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useTags } from '../../context';

export interface TagListProps {
  kid: string;
}

export const TagList: React.FC<TagListProps> = React.memo(({ kid }) => {
  const { manager } = useTags();
  const attachments = manager!.useResource(kid);

  return <div>list</div>;
});
