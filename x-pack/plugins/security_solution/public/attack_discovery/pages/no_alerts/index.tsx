/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar } from '@kbn/elastic-assistant';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from './translations';
import { Generate } from '../generate';

interface Props {
  isDisabled: boolean;
  isLoading: boolean;
  onGenerate: () => void;
}

const NoAlertsComponent: React.FC<Props> = ({ isDisabled, isLoading, onGenerate }) => {
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
            <EuiFlexItem data-test-subj="noAlertsTitle" grow={false}>
              <span>{i18n.NO_ALERTS_TO_ANALYZE}</span>
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
            {i18n.ATTACK_DISCOVERY_ONLY}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="noAlerts"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt body={body} title={title} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiLink
          external={true}
          data-test-subj="learnMoreLink"
          href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
          target="_blank"
        >
          {i18n.LEARN_MORE}
        </EuiLink>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Generate isDisabled={isDisabled} isLoading={isLoading} onGenerate={onGenerate} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const NoAlerts = React.memo(NoAlertsComponent);
