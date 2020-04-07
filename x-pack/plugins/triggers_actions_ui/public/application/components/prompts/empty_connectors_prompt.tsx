/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';

export const EmptyConnectorsPrompt = ({ onCTAClicked }: { onCTAClicked: () => void }) => (
  <EuiEmptyPrompt
    data-test-subj="createFirstConnectorEmptyPrompt"
    title={
      <Fragment>
        <EuiIcon type="logoSlack" size="xl" className="actConnectorsList__logo" />
        <EuiIcon type="logoGmail" size="xl" className="actConnectorsList__logo" />
        <EuiIcon type="logoWebhook" size="xl" className="actConnectorsList__logo" />
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionsConnectorsList.addActionEmptyTitle"
              defaultMessage="Create your first connector"
            />
          </h2>
        </EuiTitle>
      </Fragment>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionsConnectorsList.addActionEmptyBody"
          defaultMessage="Configure email, Slack, Elasticsearch, and third-party services that Kibana can trigger."
        />
      </p>
    }
    actions={
      <EuiButton
        data-test-subj="createFirstActionButton"
        key="create-action"
        fill
        iconType="plusInCircle"
        iconSide="left"
        onClick={onCTAClicked}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionsConnectorsList.addActionButtonLabel"
          defaultMessage="Create connector"
        />
      </EuiButton>
    }
  />
);
