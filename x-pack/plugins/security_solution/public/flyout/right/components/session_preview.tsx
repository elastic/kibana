/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiIcon, EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import React, { useMemo, type FC } from 'react';

import { useProcessData } from '../hooks/use_process_data';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import { SESSION_PREVIEW_TITLE } from './translations';

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
    )}{' '}
    {children}
  </>
);

/**
 * Renders session preview under visualistions section in the flyout right EuiPanel
 */
export const SessionPreview: FC = () => {
  const { processName, userName, startAt, rule, workdir, command } = useProcessData();
  const { euiTheme } = useEuiTheme();

  const emphasisStyles = useMemo(
    () => ({ fontWeight: euiTheme.font.weight.bold }),
    [euiTheme.font.weight.bold]
  );

  const processNameFragment = useMemo(() => {
    return (
      processName && (
        <ValueContainer text={'started'}>
          <span style={emphasisStyles}>{processName}</span>
        </ValueContainer>
      )
    );
  }, [emphasisStyles, processName]);

  const timeFragment = useMemo(() => {
    return (
      startAt && (
        <ValueContainer text="at">
          <span>{startAt}</span>
        </ValueContainer>
      )
    );
  }, [startAt]);

  const ruleFragment = useMemo(() => {
    return (
      rule && (
        <ValueContainer text={'with alert'}>
          <EuiLink>{rule}</EuiLink>
        </ValueContainer>
      )
    );
  }, [rule]);

  const commandFragment = useMemo(() => {
    return (
      command && (
        <ValueContainer text="by">
          <span style={emphasisStyles}>
            {workdir} {command}
          </span>
        </ValueContainer>
      )
    );
  }, [command, emphasisStyles, workdir]);

  return (
    <EuiPanel hasBorder={true} paddingSize="none" data-test-subj={SESSION_PREVIEW_TEST_ID}>
      <EuiPanel color="subdued" paddingSize="s">
        <EuiButtonEmpty color="primary" iconType="sessionViewer">
          {SESSION_PREVIEW_TITLE}
        </EuiButtonEmpty>

        <div>
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
      </EuiPanel>
    </EuiPanel>
  );
};
