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

export const EditTransformDestinationIndex: FC = () => {
  const { formFields } = useEditTransformFlyoutState();
  const dispatch = useEditTransformFlyoutDispatch();

  return (
    <EditTransformFlyoutFormTextInput
      dataTestSubj="transformEditFlyoutDestinationIndexInput"
      errorMessages={formFields.destinationIndex.errorMessages}
      label={i18n.translate('xpack.transform.transformList.editFlyoutFormDestinationIndexLabel', {
        defaultMessage: 'Destination index',
      })}
      onChange={(value) => dispatch({ field: 'destinationIndex', value })}
      value={formFields.destinationIndex.value}
    />
  );
};
