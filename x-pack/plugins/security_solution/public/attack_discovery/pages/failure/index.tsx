/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

const FailureComponent: React.FC<{ failureReason: string }> = ({ failureReason }) => {
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
          title={<h2 data-test-subj="failureTitle">{i18n.FAILURE_TITLE}</h2>}
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
