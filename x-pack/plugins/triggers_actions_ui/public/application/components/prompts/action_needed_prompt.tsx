/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const ActionNeededPrompt: FunctionComponent = ({ children }) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="createFirstAlertEmptyPrompt"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionNeededPrompt.title"
          defaultMessage="Action needed"
        />
      </h2>
    }
    body={children}
  />
);
