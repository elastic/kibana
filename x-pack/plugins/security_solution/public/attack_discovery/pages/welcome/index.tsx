/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar } from '@kbn/elastic-assistant';
import { ConnectorSetup } from '@kbn/elastic-assistant/impl/connectorland/connector_setup';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from './translations';

const WelcomeComponent: React.FC = () => {
  const title = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="emptyPromptTitleContainer"
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem data-test-subj="emptyPromptAvatar" grow={false}>
          <AssistantAvatar size="m" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <EuiFlexItem data-test-subj="welcomeTitle" grow={false}>
              <span>{i18n.WELCOME_TO_ATTACK_DISCOVERY}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const body = useMemo(
    () => (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="bodyContainer"
        direction="column"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="bodyText">
            {i18n.FIRST_SET_UP}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="welcome" direction="column" gutterSize="none">
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt body={body} title={title} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ConnectorSetup
          onConversationUpdate={async () => {}}
          updateConversationsOnSaveConnector={false} // no conversation to update
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

WelcomeComponent.displayName = 'Welcome';

export const Welcome = React.memo(WelcomeComponent);
