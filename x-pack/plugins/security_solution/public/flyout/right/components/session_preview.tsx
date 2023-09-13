/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useMemo, type FC } from 'react';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { useProcessData } from '../hooks/use_process_data';
import {
  SESSION_PREVIEW_COMMAND_TEXT,
  SESSION_PREVIEW_PROCESS_TEXT,
  SESSION_PREVIEW_RULE_TEXT,
  SESSION_PREVIEW_TIME_TEXT,
} from './translations';
import { RenderRuleName } from '../../../timelines/components/timeline/body/renderers/formatted_field_helpers';

/**
 * One-off helper to make sure that inline values are rendered consistently
 */
const ValueContainer: FC<{ text?: string }> = ({ text, children }) => (
  <>
    {text && (
      <>
        &nbsp;
        <span>{text}</span>
        &nbsp;
      </>
    )}
    {children}
  </>
);

/**
 * Renders session preview under Visualizations section in the flyout right EuiPanel
 */
export const SessionPreview: FC = () => {
  const { eventId, scopeId } = useRightPanelContext();

  const { processName, userName, startAt, ruleName, ruleId, workdir, command } = useProcessData();
  const { euiTheme } = useEuiTheme();

  const emphasisStyles = useMemo(
    () => ({ fontWeight: euiTheme.font.weight.bold }),
    [euiTheme.font.weight.bold]
  );

  const processNameFragment = useMemo(() => {
    return (
      processName && (
        <ValueContainer text={SESSION_PREVIEW_PROCESS_TEXT}>
          <span style={emphasisStyles}>{processName}</span>
        </ValueContainer>
      )
    );
  }, [emphasisStyles, processName]);

  const timeFragment = useMemo(() => {
    return (
      startAt && (
        <ValueContainer text={SESSION_PREVIEW_TIME_TEXT}>
          <PreferenceFormattedDate value={new Date(startAt)} />
        </ValueContainer>
      )
    );
  }, [startAt]);

  const ruleFragment = useMemo(() => {
    return (
      ruleName &&
      ruleId && (
        <ValueContainer text={SESSION_PREVIEW_RULE_TEXT}>
          <RenderRuleName
            contextId={scopeId}
            eventId={eventId}
            fieldName={SIGNAL_RULE_NAME_FIELD_NAME}
            fieldType={'string'}
            isAggregatable={false}
            isDraggable={false}
            linkValue={ruleId}
            value={ruleName}
          />
        </ValueContainer>
      )
    );
  }, [ruleName, ruleId, scopeId, eventId]);

  const commandFragment = useMemo(() => {
    return (
      command && (
        <ValueContainer text={SESSION_PREVIEW_COMMAND_TEXT}>
          <EuiCode>
            {workdir} {command}
          </EuiCode>
        </ValueContainer>
      )
    );
  }, [command, workdir]);

  return (
    <div data-test-subj={SESSION_PREVIEW_TEST_ID}>
      <ValueContainer>
        <EuiIcon type="user" />
        &nbsp;
        <span style={emphasisStyles}>{userName}</span>
      </ValueContainer>
      {processNameFragment}
      {timeFragment}
      {ruleFragment}
      {commandFragment}
    </div>
  );
};
