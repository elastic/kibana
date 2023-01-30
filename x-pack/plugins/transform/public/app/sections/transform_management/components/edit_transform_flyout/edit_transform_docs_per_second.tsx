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
  useEditTransformFlyoutStateFormFieldDocsPerSecond,
  useEditTransformFlyoutActions,
} from './use_edit_transform_flyout';

export const EditTransformDocsPerSecond: FC = () => {
  const { errorMessages, value } = useEditTransformFlyoutStateFormFieldDocsPerSecond();
  const { formField } = useEditTransformFlyoutActions();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutDocsPerSecondInput"
      errorMessages={errorMessages}
      helpText={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelpText',
        {
          defaultMessage: 'To enable throttling, set a limit of documents to input per second.',
        }
      )}
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormDocsPerSecondLabel', {
        defaultMessage: 'Documents per second',
      })}
      onChange={(valueUpdate) => formField({ field: 'docsPerSecond', value: valueUpdate })}
      value={value}
    />
  );
};
