/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  errorText: string | null;
}

export const ErrorMessage: FC<Props> = ({ errorText }) => {
  return errorText === null ? null : (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.exploration.querySyntaxError', {
          defaultMessage: 'An error occurred',
        })}
        color="danger"
        iconType="cross"
      >
        <p>{errorText}</p>
      </EuiCallOut>
    </>
  );
};
