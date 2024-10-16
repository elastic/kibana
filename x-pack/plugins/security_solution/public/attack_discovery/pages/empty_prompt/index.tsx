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
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { AnimatedCounter } from './animated_counter';
import { Generate } from '../generate';
import * as i18n from './translations';

interface Props {
  aiConnectorsCount: number | null; // null when connectors are not configured
  alertsCount: number;
  attackDiscoveriesCount: number;
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: () => void;
}

const EmptyPromptComponent: React.FC<Props> = ({
  aiConnectorsCount,
  alertsCount,
  attackDiscoveriesCount,
  isLoading,
  isDisabled = false,
  onGenerate,
}) => {
  const { euiTheme } = useEuiTheme();
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
            <EuiFlexItem
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
              data-test-subj="upTo"
              grow={false}
            >
              <span>{i18n.UP_TO}</span>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="emptyPromptAnimatedCounter" grow={false}>
              <AnimatedCounter count={alertsCount} />
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="emptyPromptAlertsWillBeAnalyzed" grow={false}>
              <span>{i18n.ALERTS_WILL_BE_ANALYZED(alertsCount)}</span>
            </EuiFlexItem>

            <EuiFlexItem
              css={css`
                margin-left: ${euiTheme.size.xs};
              `}
              grow={false}
            >
              <EuiIconTip
                content={i18n.RESPONSES_FROM_AI_SYSTEMS}
                data-test-subj="responsesFromAiSystemsTooltip"
                position="right"
                type="iInCircle"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [alertsCount, euiTheme.size.xs]
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
          <EuiText color="subdued" data-test-subj="startGeneratingDiscoveriesLabel">
            {i18n.START_GENERATING_DISCOVERIES}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const actions = useMemo(() => {
    return <Generate isLoading={isLoading} isDisabled={isDisabled} onGenerate={onGenerate} />;
  }, [isDisabled, isLoading, onGenerate]);

  if (isLoading || aiConnectorsCount == null || attackDiscoveriesCount > 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="emptyPrompt"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj="emptyPromptContainer" grow={false}>
        <EuiEmptyPrompt actions={actions} body={body} title={title} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="learnMore"
          href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
          target="_blank"
        >
          {i18n.LEARN_MORE}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EmptyPrompt = React.memo(EmptyPromptComponent);
