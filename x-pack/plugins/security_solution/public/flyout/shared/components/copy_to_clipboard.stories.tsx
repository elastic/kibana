/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiButtonEmpty } from '@elastic/eui';
import { CopyToClipboard } from './copy_to_clipboard';

export default {
  component: CopyToClipboard,
  title: 'Flyout/CopyToClipboard',
};

const json = JSON.stringify({
  foo: 'bar',
});

export const Default: Story<void> = () => {
  return (
    <CopyToClipboard rawValue={json}>
      <EuiButtonEmpty iconType={'copyClipboard'} aria-label={'Copy'}>
        {'Copy'}
      </EuiButtonEmpty>
    </CopyToClipboard>
  );
};

export const WithModifier: Story<void> = () => {
  return (
    <CopyToClipboard
      rawValue={json}
      modifier={(value) => {
        window.alert('modifier');
        return value;
      }}
    >
      <EuiButtonEmpty iconType={'copyClipboard'} aria-label={'Copy'}>
        {'Copy with modifier'}
      </EuiButtonEmpty>
    </CopyToClipboard>
  );
};
