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
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { CoPilotPromptId } from '../../../common';
import type { PromptParamsOf } from '../../../common/co_pilot';
import type { CoPilotService } from '../../typings/co_pilot';
import { CoPilotChatBody } from '../co_pilot_chat_body';

export interface CoPilotPromptProps<TPromptId extends CoPilotPromptId> {
  title: string;
  promptId: TPromptId;
  coPilot: CoPilotService;
  params: PromptParamsOf<TPromptId>;
}

// eslint-disable-next-line import/no-default-export
export default function CoPilotPrompt<TPromptId extends CoPilotPromptId>({
  title,
  coPilot,
  promptId,
  params,
}: CoPilotPromptProps<TPromptId>) {
  const [hasOpened, setHasOpened] = useState(false);

  const theme = useEuiTheme();

  const response$ = useMemo(() => {
    return hasOpened ? coPilot.prompt(promptId, params) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, promptId, hasOpened]);

  const tooltipContent = i18n.translate('xpack.observability.coPilotPrompt.askCoPilot', {
    defaultMessage: 'Ask Observability Co-Pilot for assistence',
  });

  return (
    <EuiPanel color="primary">
      <EuiAccordion
        id={title}
        css={css`
          .euiButtonIcon {
            color: ${theme.euiTheme.colors.primaryText};
          }
        `}
        buttonClassName={css`
          display: block;
          width: 100%;
        `}
        buttonContent={
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow>
              <EuiText size="m" color={theme.euiTheme.colors.primaryText}>
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={tooltipContent}>
                <EuiIcon color={theme.euiTheme.colors.primaryText} type="questionInCircle" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen={false}
        onToggle={() => {
          setHasOpened(true);
        }}
      >
        <EuiSpacer size="s" />
        {response$ ? <CoPilotChatBody response$={response$} /> : undefined}
      </EuiAccordion>
    </EuiPanel>
  );
}
