/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useSubmitErrorMessage } from '@kbn/ml-form-utils/use_submit_error_message';

import { editTransformFlyoutSlice } from '../state_management/edit_transform_flyout_state';

export const EditTransformApiErrorCallout: FC = () => {
  const submitErrorMessage = useSubmitErrorMessage(editTransformFlyoutSlice.name);

  if (submitErrorMessage === undefined) return null;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.translate('xpack.transform.transformList.editTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to update transforms.',
        })}
        color="danger"
        iconType="warning"
      >
        <p>{submitErrorMessage}</p>
      </EuiCallOut>
    </>
  );
};
