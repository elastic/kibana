/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import {
  useEditTransformFlyoutStateFormFieldDescription,
  useEditTransformFlyoutActions,
} from './use_edit_transform_flyout';

export const EditTransformDescription: FC = () => {
  const { errorMessages, value } = useEditTransformFlyoutStateFormFieldDescription();
  const { formField } = useEditTransformFlyoutActions();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutDescriptionInput"
      errorMessages={errorMessages}
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
        defaultMessage: 'Description',
      })}
      onChange={(valueUpdate) => formField({ field: 'description', value: valueUpdate })}
      value={value}
    />
  );
};
