/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

export const EmptyPrompt = ({ onCTAClicked }: { onCTAClicked: () => void }) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="createFirstAlertEmptyPrompt"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.emptyPrompt.emptyTitle"
          defaultMessage="Create your first alert"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.emptyPrompt.emptyDesc"
          defaultMessage="Receive an alert through email, Slack, or another connector when a trigger is hit."
        />
      </p>
    }
    actions={
      <EuiButton
        data-test-subj="createFirstAlertButton"
        key="create-action"
        fill
        onClick={onCTAClicked}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.components.emptyPrompt.emptyButton"
          defaultMessage="Create alert"
        />
      </EuiButton>
    }
  />
);
