/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { CreateNewTagForm as CreateNewTagFormUi } from '../../components/create_new_tag_form';
import { useServices } from '../../context';
import { Tag } from '../../../../common';

export interface Props {
  onCreate?: (tag: Tag) => void;
}

export const CreateNewTagForm: React.FC<Props> = ({ onCreate }) => {
  const services = useServices();
  const isMounted = useMountedState();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    try {
      const { tag } = await services.params.tagsClient.create({
        tag: {
          title,
          color,
          description,
        },
      });
      if (!isMounted()) return;
      alert('created');
      if (onCreate) onCreate(tag);
    } catch (error) {
      if (!isMounted()) return;
      alert(error.message);
    }
  };

  return (
    <CreateNewTagFormUi
      title={title}
      color={color}
      description={description}
      onTitleChange={setTitle}
      onColorChange={setColor}
      onDescriptionChange={setDescription}
      onSubmit={handleSubmit}
    />
  );
};
