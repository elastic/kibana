/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiResizableContainer } from '@elastic/eui';
import { StateChange } from './components/state_change';

import '@elastic/eui/dist/eui_theme_light.css';
import './panel.css';

import { RecordedAction } from './types';
import { ActionList, ActionTree } from './components';

export const Panel = () => {
  const [selectedAction, setSelectedAction] = useState<RecordedAction | null>(null);

  return (
    <EuiResizableContainer className="panel__resizeableContainer">
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel initialSize={50}>
            <ActionList onSelect={setSelectedAction} />
          </EuiResizablePanel>
          <EuiResizableButton />
          <EuiResizablePanel initialSize={50}>
            <StateChange action={selectedAction} />
            <ActionTree action={selectedAction} />
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
};
