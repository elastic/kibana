/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiButton, EuiPageTemplate, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';

export const EmptyNotificationsPrompt = ({ onCTAClicked }: { onCTAClicked: () => void }) => (
  <EuiPageTemplate.EmptyPrompt
    data-test-subj="createFirstNotificationEmptyPrompt"
    title={
      <>
        <EuiIcon type="bell" size="xl" className="actEmptyNotificationsPrompt__logo" />
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.emptyNotificationsPrompt.addPolicyEmptyTitle"
              defaultMessage="Create your first notification policy"
            />
          </h2>
        </EuiTitle>
      </>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.emptyNotificationsPrompt.addPolicyEmptyBody"
          defaultMessage="Configure when and how to send notifications for your alerts"
        />
      </p>
    }
    actions={
      <>
        <EuiButton
          data-test-subj="createFirstNotificationButton"
          key="create-notification"
          fill
          iconType="plusInCircle"
          iconSide="left"
          onClick={onCTAClicked}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.components.emptyNotificationsPrompt.addPolicyButtonLabel"
            defaultMessage="Create policy"
          />
        </EuiButton>
        <br />
      </>
    }
  />
);
