/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
    <CopyToClipboard
      rawValue={json}
      text={<p>{'Copy'}</p>}
      iconType={'copyClipboard'}
      ariaLabel={'Copy'}
    />
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
      text={<p>{'Copy'}</p>}
      iconType={'copyClipboard'}
      ariaLabel={'Copy'}
    />
  );
};

export const MultipleSizes: Story<void> = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <CopyToClipboard
          rawValue={json}
          text={<p>{'xs size'}</p>}
          iconType={'copyClipboard'}
          size={'xs'}
          ariaLabel={'Copy'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CopyToClipboard
          rawValue={json}
          text={<p>{'s size'}</p>}
          iconType={'copyClipboard'}
          size={'s'}
          ariaLabel={'Copy'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CopyToClipboard
          rawValue={json}
          text={<p>{'m size'}</p>}
          iconType={'copyClipboard'}
          size={'m'}
          ariaLabel={'Copy'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
