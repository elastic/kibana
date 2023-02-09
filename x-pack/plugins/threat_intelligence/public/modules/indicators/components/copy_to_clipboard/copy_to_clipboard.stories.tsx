/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { EuiContextMenuPanel } from '@elastic/eui';
import {
  CopyToClipboardButtonEmpty,
  CopyToClipboardButtonIcon,
  CopyToClipboardContextMenu,
} from '.';

export default {
  title: 'CopyToClipboard',
};

const mockValue: string = 'Text copied!';

export const ButtonEmpty: Story<void> = () => {
  return <CopyToClipboardButtonEmpty value={mockValue} />;
};

export const ContextMenu: Story<void> = () => {
  const items = [<CopyToClipboardContextMenu value={mockValue} />];

  return <EuiContextMenuPanel items={items} />;
};

export const ButtonIcon: Story<void> = () => {
  return <CopyToClipboardButtonIcon value={mockValue} />;
};
