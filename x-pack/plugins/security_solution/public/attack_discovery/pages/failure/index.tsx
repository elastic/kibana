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

const FailureComponent: React.FC<{ failureReason: string }> = ({ failureReason }) => {
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
            <EuiFlexItem data-test-subj="failureTitle" grow={false}>
              <span>{i18n.FAILURE_TITLE}</span>
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
            {failureReason}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [failureReason]
  );

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="failure" direction="column">
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          body={
            <EuiText color="subdued" data-test-subj="bodyText">
              {failureReason}
            </EuiText>
          }
          title={<h2>{i18n.FAILURE_TITLE}</h2>}
        />
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
    </EuiFlexGroup>
  );
};

export const Failure = React.memo(FailureComponent);
