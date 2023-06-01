/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { OpenAIPromptId, PromptParamsOf } from '../../../common/openai';
import { CoPilotService, PromptObservableState } from '../../hooks/use_co_pilot';

const cursorCss = css`
  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

interface Props<TPromptId extends OpenAIPromptId> {
  title: string;
  promptId: TPromptId;
  coPilot: CoPilotService;
  params: PromptParamsOf<TPromptId>;
}

export function CoPilotPrompt<TPromptId extends OpenAIPromptId>({
  title,
  coPilot,
  promptId,
  params,
}: Props<TPromptId>) {
  const [hasOpened, setHasOpened] = useState(false);

  const theme = useEuiTheme();

  const conversation$ = useMemo(() => {
    return hasOpened
      ? coPilot.prompt(promptId, params)
      : new Observable<PromptObservableState>(() => {});
  }, [params, promptId, coPilot, hasOpened]);

  const conversation = useObservable(conversation$);

  const content = conversation?.message ?? '';

  const isLoading = hasOpened && conversation?.loading !== false;

  const cursor = isLoading ? <span className={cursorCss} /> : <></>;

  const chat = (
    <p style={{ whiteSpace: 'pre-wrap', paddingTop: theme.euiTheme.size.m, lineHeight: 1.5 }}>
      {content}
      {cursor}
    </p>
  );

  return (
    <EuiPanel color="primary">
      <EuiAccordion
        id={title}
        isLoading={isLoading}
        buttonContent={
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="help" size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <strong>{title}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.observability.coPilotPrompt.askCoPilot', {
                  defaultMessage: 'Ask Observability Co-Pilot for assistence',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen={false}
        onToggle={() => {
          setHasOpened(true);
        }}
      >
        {chat}
      </EuiAccordion>
    </EuiPanel>
  );
}
