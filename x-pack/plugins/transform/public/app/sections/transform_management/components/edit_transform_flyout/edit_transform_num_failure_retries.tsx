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
  useEditTransformFlyoutState,
  useEditTransformFlyoutDispatch,
} from './use_edit_transform_flyout';

export const EditTransformNumFailureRetries: FC = () => {
  const { formFields } = useEditTransformFlyoutState();
  const dispatch = useEditTransformFlyoutDispatch();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutNumFailureRetriesInput"
      errorMessages={formFields.numFailureRetries.errorMessages}
      helpText={i18n.translate(
        'xpack.transform.transformList.editFlyoutFormNumFailureRetriesHelpText',
        {
          defaultMessage:
            'The number of retries on a recoverable failure before the transform task is marked as failed. Set it to -1 for infinite retries.',
        }
      )}
      label={i18n.translate('xpack.transform.transformList.numFailureRetriesLabel', {
        defaultMessage: 'Number of failure retries',
      })}
      onChange={(value) => dispatch({ field: 'numFailureRetries', value })}
      value={formFields.numFailureRetries.value}
    />
  );
};
