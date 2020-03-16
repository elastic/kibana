/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { FormMessage } from '../../hooks/use_create_analytics_form/state'; // State

interface Props {
  messages: any; // TODO: fix --> something like State['requestMessages'];
}

export const Messages: FC<Props> = ({ messages }) =>
  messages.map((requestMessage: FormMessage, i: number) => (
    <Fragment key={i}>
      <EuiCallOut
        title={requestMessage.message}
        color={requestMessage.error !== undefined ? 'danger' : 'primary'}
        iconType={requestMessage.error !== undefined ? 'alert' : 'checkInCircleFilled'}
        size="s"
      >
        {requestMessage.error !== undefined ? <p>{requestMessage.error}</p> : null}
      </EuiCallOut>
      <EuiSpacer size="s" />
    </Fragment>
  ));
