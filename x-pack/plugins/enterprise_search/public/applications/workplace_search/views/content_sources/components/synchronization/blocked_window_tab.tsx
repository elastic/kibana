/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';

import { ADD_LABEL } from '../../../../constants';
import { BLOCKED_EMPTY_STATE_TITLE, BLOCKED_EMPTY_STATE_DESCRIPTION } from '../../constants';
import { SourceLogic } from '../../source_logic';

import { BlockedWindowItem } from './blocked_window_item';
import { SynchronizationLogic } from './synchronization_logic';

export const BlockedWindows: React.FC = () => {
  const { contentSource } = useValues(SourceLogic);
  const {
    schedule: { blockedWindows },
  } = useValues(SynchronizationLogic({ contentSource }));
  const { addBlockedWindow } = useActions(SynchronizationLogic({ contentSource }));

  const hasBlockedWindows = blockedWindows && blockedWindows.length > 0;

  const emptyState = (
    <>
      <EuiSpacer />
      <EuiEmptyPrompt
        iconType="clock"
        title={<h2>{BLOCKED_EMPTY_STATE_TITLE}</h2>}
        body={<p>{BLOCKED_EMPTY_STATE_DESCRIPTION}</p>}
        actions={
          <EuiButton color="primary" fill onClick={addBlockedWindow}>
            {ADD_LABEL}
          </EuiButton>
        }
      />
    </>
  );

  const blockedWindowItems = (
    <>
      {blockedWindows?.map((blockedWindow, i) => (
        <BlockedWindowItem key={i} index={i} blockedWindow={blockedWindow} />
      ))}
      <EuiSpacer />
      <EuiButton onClick={addBlockedWindow}>{ADD_LABEL}</EuiButton>
    </>
  );

  return hasBlockedWindows ? blockedWindowItems : emptyState;
};
