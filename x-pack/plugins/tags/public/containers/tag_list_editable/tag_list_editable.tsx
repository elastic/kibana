/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { TagList } from '../tag_list';
import { TagPicker } from '../tag_picker';

export interface TagListEditableProps {
  kid: string;
}

export const TagListEditable: React.FC<TagListEditableProps> = React.memo(({ kid }) => {
  const [edit, setEdit] = useState(false);

  if (!edit) {
    return <TagList kid={kid} onEditClick={() => setEdit(true)} />;
  }

  return <TagPicker selected={[]} onChange={() => {}} />;
});
