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

const defaultColor = '#548034';

export interface Props {
  onCreate?: (tag: RawTagWithId) => void;
}

export const CreateNewTagForm: React.FC<Props> = ({ onCreate }) => {
  const unmount$ = useUnmount$();
  const { manager, params } = useServices();
  const toasts = useToasts();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [description, setDescription] = useState('');
  const [disabled, setDisabled] = useState(false);

  const handleSubmit = async () => {
    setDisabled(true);
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
          setDisabled(false);
        }
      );
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
