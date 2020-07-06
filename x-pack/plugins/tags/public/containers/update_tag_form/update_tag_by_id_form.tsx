/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { UpdateTagForm, UpdateTagFormProps } from './update_tag_form';
import { useTags } from '../../context';

export interface UpdateTagByIdFormProps extends Omit<UpdateTagFormProps, 'tag'> {
  id: string;
}

export const UpdateTagByIdForm: React.FC<UpdateTagByIdFormProps> = ({ id, ...rest }) => {
  const { manager } = useTags();
  const tag = manager.useTag(id);

  if (!tag) return null;

  return <UpdateTagForm {...rest} tag={tag} />;
};
