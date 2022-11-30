/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageTemplate,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import './empty_connectors_prompt.scss';

export const EmptyConnectorsPrompt = ({
  onCTAClicked,
  docLinks,
}: {
  onCTAClicked: () => void;
  docLinks: DocLinksStart;
}) => (
  <EuiPageTemplate.EmptyPrompt
    data-test-subj="createFirstConnectorEmptyPrompt"
    title={
      <>
        <EuiIcon type="logoSlack" size="xl" className="actEmptyConnectorsPrompt__logo" />
        <EuiIcon type="logoGmail" size="xl" className="actEmptyConnectorsPrompt__logo" />
        <EuiIcon type="logoWebhook" size="xl" className="actEmptyConnectorsPrompt__logo" />
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.emptyConnectorsPrompt.addConnectorEmptyTitle"
              defaultMessage="Create your first connector"
            />
          </h2>
        </EuiTitle>
      </>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.emptyConnectorsPrompt.addConnectorEmptyBody"
          defaultMessage="Configure various third-party services to Kibana."
        />
      </p>
    }
    actions={
      <>
        <EuiButton
          data-test-subj="createFirstActionButton"
          key="create-action"
          fill
          iconType="plusInCircle"
          iconSide="left"
          onClick={onCTAClicked}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.components.emptyConnectorsPrompt.addConnectorButtonLabel"
            defaultMessage="Create connector"
          />
        </EuiButton>
        <br />
        <EuiButtonEmpty
          data-test-subj="documentationButton"
          key="documentation-button"
          target="_blank"
          href={docLinks.links.alerting.connectors}
          iconType="help"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionsConnectorsList.documentationButtonLabel"
            defaultMessage="Documentation"
          />
        </EuiButtonEmpty>
      </>
    }
  />
);
