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
  useEditTransformFlyoutStateFormFieldFrequency,
  useEditTransformFlyoutActions,
} from './use_edit_transform_flyout';

export const EditTransformFrequency: FC = () => {
  const { defaultValue, errorMessages, value } = useEditTransformFlyoutStateFormFieldFrequency();
  const { formField } = useEditTransformFlyoutActions();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutFrequencyInput"
      errorMessages={errorMessages}
      helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelpText', {
        defaultMessage:
          'The interval to check for changes in source indices when the transform runs continuously.',
      })}
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
        defaultMessage: 'Frequency',
      })}
      onChange={(valueUpdate) => formField({ field: 'frequency', value: valueUpdate })}
      placeholder={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormFrequencyPlaceholderText',
        {
          defaultMessage: 'Default: {defaultValue}',
          values: { defaultValue },
        }
      )}
      value={value}
    />
  );
};
