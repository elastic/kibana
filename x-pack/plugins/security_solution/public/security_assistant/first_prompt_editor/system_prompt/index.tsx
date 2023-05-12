/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { getPromptById } from '../helpers';
import { getOptions } from './helpers';
import * as i18n from './translations';
import type { Prompt } from '../../types';

const SystemPromptText = styled(EuiText)`
  white-space: pre-line;
`;

interface Props {
  selectedSystemPromptId: string | null;
  setSelectedSystemPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  systemPrompts: Prompt[];
}

const SystemPromptComponent: React.FC<Props> = ({
  selectedSystemPromptId,
  setSelectedSystemPromptId,
  systemPrompts,
}) => {
  const [showSelectSystemPrompt, setShowSelectSystemPrompt] = React.useState<boolean>(false);
  const options = useMemo(() => getOptions(systemPrompts), [systemPrompts]);

  const selectedPrompt: Prompt | undefined = useMemo(
    () => getPromptById({ prompts: systemPrompts, id: selectedSystemPromptId ?? '' }),
    [systemPrompts, selectedSystemPromptId]
  );

  const onChange = useCallback(
    (value) => {
      setSelectedSystemPromptId(value);
      setShowSelectSystemPrompt(false);
    },
    [setSelectedSystemPromptId]
  );

  const clearSystemPrompt = useCallback(() => {
    setSelectedSystemPromptId(null);
    setShowSelectSystemPrompt(false);
  }, [setSelectedSystemPromptId]);

  const onShowSelectSystemPrompt = useCallback(() => setShowSelectSystemPrompt(true), []);

  if (selectedPrompt == null || showSelectSystemPrompt) {
    return (
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow>
          {showSelectSystemPrompt && (
            <EuiSuperSelect
              fullWidth={true}
              hasDividers
              itemLayoutAlign="top"
              onChange={onChange}
              options={options}
              placeholder={i18n.SELECT_A_SYSTEM_PROMPT}
              valueOfSelected={selectedPrompt?.id}
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.ADD_SYSTEM_PROMPT_TOOLTIP} position="right">
            <EuiButtonIcon
              iconType={showSelectSystemPrompt ? 'trash' : 'plus'}
              onClick={showSelectSystemPrompt ? clearSystemPrompt : onShowSelectSystemPrompt}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="none">
      <EuiFlexItem grow>
        <SystemPromptText color="subdued">{selectedPrompt?.content ?? ''}</SystemPromptText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.SELECT_A_SYSTEM_PROMPT} position="right">
              <EuiButtonIcon iconType="documentEdit" onClick={onShowSelectSystemPrompt} />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.CLEAR_SYSTEM_PROMPT_TOOLTIP} position="right">
              <EuiButtonIcon iconType="trash" onClick={clearSystemPrompt} />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SystemPromptComponent.displayName = 'SystemPromptComponent';

export const SystemPrompt = React.memo(SystemPromptComponent);

/*
    return (
      <EuiSuperSelect
        fullWidth={true}
        hasDividers
        itemLayoutAlign="top"
        onChange={onChange}
        options={options}
        placeholder={i18n.SELECT_A_SYSTEM_PROMPT}
        valueOfSelected={selectedPrompt?.id}
      />
    );
    */
