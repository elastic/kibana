/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPortal } from '@elastic/eui';
import React, { FC } from 'react';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';

interface Props {
  isVisible: boolean;
  hidePanel: () => void;
}

export const KeyboardShortcutsDocPanel: FC<Props> = ({ isVisible, hidePanel }) => (
  <>
    {isVisible && (
      <EuiPortal>
        <KeyboardShortcutsDoc onClose={hidePanel} />
      </EuiPortal>
    )}
  </>
);
