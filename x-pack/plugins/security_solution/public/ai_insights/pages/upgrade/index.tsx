/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar, UpgradeButtons, useAssistantContext } from '@kbn/elastic-assistant';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from './translations';

const UpgradeComponent: React.FC = () => {
  const { http } = useAssistantContext();

  const title = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantAvatar size="m" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <EuiFlexItem data-test-subj="upgradeTitle" grow={false}>
              <span>{i18n.AI_INSIGHTS}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const body = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="aiInsightsAreAvailable">
            {i18n.AI_INSIGHTS_ARE_AVAILABLE}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="pleaseUpgrade">
            {i18n.PLEASE_UPGRADE}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const actions = useMemo(() => <UpgradeButtons basePath={http.basePath.get()} />, [http.basePath]);

  return <EuiEmptyPrompt actions={actions} body={body} data-test-subj="upgrade" title={title} />;
};

export const Upgrade = React.memo(UpgradeComponent);
