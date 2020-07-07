/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { takeUntil } from 'rxjs/operators';
import { RawTagWithId } from '../../../common';
import { useToasts } from '../../../../../../src/plugins/kibana_react/public';
import { CreateNewTagForm as CreateNewTagFormUi } from '../../components/create_new_tag_form';
import { txtTagUpdated, txtCouldNotUpdate } from './i18n';
import { useUnmount$ } from '../../hooks/use_unmount';
import { useTags } from '../../context';

export interface UpdateTagFormProps {
  tag: RawTagWithId;
  onDone?: () => void;
}

export const UpdateTagForm: React.FC<UpdateTagFormProps> = ({ tag, onDone }) => {
  const { manager } = useTags();
  const unmount$ = useUnmount$();
  const toasts = useToasts();
  const [title, setTitle] = useState(tag.title);
  const [color, setColor] = useState(tag.color);
  const [description, setDescription] = useState(tag.description);
  const [disabled, setDisabled] = useState(false);

  const handleSubmit = async () => {
    setDisabled(true);
    manager
      .update$({ id: tag.id, title, color, description })
      .pipe(takeUntil(unmount$))
      .subscribe(
        () => {},
        (error) => {
          toasts.addError(error, { title: txtCouldNotUpdate });
          setDisabled(false);
        }
      );

    toasts.addSuccess({
      title: txtTagUpdated,
    });

    if (onDone) onDone();
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
