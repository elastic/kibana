/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useAiRulesMonitoringContext } from './ai_rules_monitoring_context';
import { RuleMonitoringIntervalSelector } from './rule_monitoring_interval_selector';
import * as i18n from './translations';

export function AiRulesMonitoringPage(): JSX.Element {
  const { isInitialLoading, isFetching, hasConnector, connectorPrompt, result, refetch } =
    useAiRulesMonitoringContext();
  const [comments, setComments] = useState<EuiCommentProps[]>([WELCOME_COMMENT]);

  useEffect(() => {
    if (isFetching) {
      setComments([
        WELCOME_COMMENT,
        {
          username: 'Rule Monitoring AI Assistant',
          children: (
            <EuiFlexGroup justifyContent="center">
              <EuiLoadingChart size="l" />
            </EuiFlexGroup>
          ),
          event: ' ',
        },
      ]);
    } else if (result) {
      setComments([
        WELCOME_COMMENT,
        {
          username: 'Rule Monitoring AI Assistant',
          children: <EuiMarkdownFormat>{result}</EuiMarkdownFormat>,
          event: ' ',
        },
      ]);
    }
  }, [isFetching, result]);

  if (isInitialLoading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  if (!hasConnector) {
    return (
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiText>
          <p>{i18n.CONNECTOR_NEEDED}</p>
        </EuiText>
        {connectorPrompt}
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <RuleMonitoringIntervalSelector />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton isLoading={isFetching} onClick={refetch} disabled={isFetching}>
            {'Analyze'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiFlexItem>
          <EuiCommentList comments={comments} aria-label="Comment list example" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const WELCOME_BODY = (
  <EuiText size="s">
    <p>{i18n.WELCOME_GENERAL_INFO}</p>
    <p>{i18n.WELCOME_EXPLANATION}</p>
    <p>{i18n.WELCOME_ACTION}</p>
  </EuiText>
);

const WELCOME_COMMENT = {
  username: 'System',
  children: WELCOME_BODY,
  event: ' ',
};
