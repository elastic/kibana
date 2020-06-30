/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { takeUntil } from 'rxjs/operators';
import { useToasts } from '../../../../../../../src/plugins/kibana_react/public';
import { CreateNewTagForm as CreateNewTagFormUi } from '../../components/create_new_tag_form';
import { useServices } from '../../context';
import { RawTagWithId } from '../../../../common';
import { txtTagCreated, txtCouldNotCreate } from './i18n';
import { useUnmount$ } from '../../hooks/use_unmount';

export interface Props {
  onCreate?: (tag: RawTagWithId) => void;
}

export const CreateNewTagForm: React.FC<Props> = ({ onCreate }) => {
  const unmount$ = useUnmount$();
  const { manager, params } = useServices();
  const toasts = useToasts();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    manager
      .create$({
        tag: {
          title,
          color,
          description,
        },
      })
      .pipe(takeUntil(unmount$))
      .subscribe(
        () => {
          toasts.addSuccess({
            title: txtTagCreated,
          });
          params.history.push('/');
        },
        (error) => {
          toasts.addError(error, { title: txtCouldNotCreate });
        }
      );
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
