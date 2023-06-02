/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useEditTransformFlyout } from './use_edit_transform_flyout';

export const EditTransformApiErrorCallout: FC = () => {
  const apiErrorMessage = useEditTransformFlyout('apiErrorMessage');

  return (
    <>
      {apiErrorMessage !== undefined && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.transform.transformList.editTransformGenericErrorMessage',
              {
                defaultMessage: 'An error occurred calling the API endpoint to update transforms.',
              }
            )}
            color="danger"
            iconType="warning"
          >
            <p>{apiErrorMessage}</p>
          </EuiCallOut>
        </>
      )}
    </>
  );
};
