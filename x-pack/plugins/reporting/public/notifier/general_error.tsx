/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { ToastInput } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

export const getGeneralErrorToast = (errorText: string, err: Error): ToastInput => ({
  text: toMountPoint(
    <Fragment>
      <EuiCallOut title={errorText} color="danger" iconType="alert">
        {err.toString()}
      </EuiCallOut>

      <EuiSpacer />

      <FormattedMessage
        id="xpack.reporting.publicNotifier.error.tryRefresh"
        defaultMessage="Try refreshing the page."
      />
    </Fragment>
  ),
  iconType: undefined,
});
