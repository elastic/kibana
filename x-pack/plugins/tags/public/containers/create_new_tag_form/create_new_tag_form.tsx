/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { takeUntil } from 'rxjs/operators';
import { useToasts } from '../../../../../../src/plugins/kibana_react/public';
import { CreateNewTagForm as CreateNewTagFormUi } from '../../components/create_new_tag_form';
import { txtTagCreated, txtCouldNotCreate } from './i18n';
import { useUnmount$ } from '../../hooks/use_unmount';
import { useTags } from '../../context';

const defaultColor = '#548034';

export interface Props {
  onCreate?: () => void;
}

export const CreateNewTagForm: React.FC<Props> = ({ onCreate }) => {
  const { manager } = useTags();
  const unmount$ = useUnmount$();
  const toasts = useToasts();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [description, setDescription] = useState('');
  const [disabled, setDisabled] = useState(false);

  const handleSubmit = async () => {
    setDisabled(true);
    manager
      .create$({
        title,
        color,
        description,
      })
      .pipe(takeUntil(unmount$))
      .subscribe(
        () => {},
        (error) => {
          toasts.addError(error, { title: txtCouldNotCreate });
          setDisabled(false);
        }
      );
    toasts.addSuccess({
      title: txtTagCreated,
    });
    if (onCreate) onCreate();
  };

  return (
    <CreateNewTagFormUi
      title={title}
      color={color}
      description={description}
      disabled={disabled}
      onTitleChange={setTitle}
      onColorChange={setColor}
      onDescriptionChange={setDescription}
      onSubmit={handleSubmit}
    />
  );
};
