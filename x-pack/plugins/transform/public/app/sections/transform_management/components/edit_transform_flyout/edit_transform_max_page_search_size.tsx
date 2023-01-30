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
  useEditTransformFlyoutStateFormFieldMaxPageSearchSize,
  useEditTransformFlyoutActions,
} from './use_edit_transform_flyout';

export const EditTransformMaxPageSearchSize: FC = () => {
  const { defaultValue, errorMessages, value } =
    useEditTransformFlyoutStateFormFieldMaxPageSearchSize();
  const { formField } = useEditTransformFlyoutActions();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutMaxPageSearchSizeInput"
      errorMessages={errorMessages}
      helpText={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeHelpText',
        {
          defaultMessage:
            'The initial page size to use for the composite aggregation for each checkpoint.',
        }
      )}
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeLabel', {
        defaultMessage: 'Maximum page search size',
      })}
      onChange={(valueUpdate) => formField({ field: 'maxPageSearchSize', value: valueUpdate })}
      value={value}
      placeholder={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizePlaceholderText',
        {
          defaultMessage: 'Default: {defaultValue}',
          values: { defaultValue },
        }
      )}
    />
  );
};
