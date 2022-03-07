/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexItem,
  EuiFieldText,
  EuiForm,
  EuiSelect,
  EuiFormRow,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
  EuiPortal,
  EuiFlyout,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiButton,
} from '@elastic/eui';

export const ConnectElasticIndex: React.FC = () => {
  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={() => {
          console.log('close flyout');
        }}
      >
        <ConnectFlyoutHeader />
        <ConnectFlyoutBody />
        <ConnectFlyoutFooter />
      </EuiFlyout>
    </EuiPortal>
  );
};

export const ConnectFlyoutHeader: React.FC = () => (
  <EuiFlyoutHeader hasBorder>
    <EuiTitle size="m">
      <h2>Connect an Elasticsearch index</h2>
    </EuiTitle>
  </EuiFlyoutHeader>
);

export const ConnectFlyoutBody: React.FC = () => (
  <EuiFlyoutBody>
    <EuiText color="subdued">
      <p>
        You can now connect directly to an existing Elasticsearch index to make its data searchable
        and tunable through Enterprise Search UIs.
        <br />
        <EuiLink href="#todo" external>
          Learn more about using an Elasticsearch index
        </EuiLink>
      </p>
    </EuiText>
    <EuiSpacer />
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiForm component="form">
        <EuiFormRow
          fullWidth
          label="Name your search index (optional)"
          helpText="Provide a unique name for your index. This name will show when configuring search engines."
        >
          <EuiFieldText />
        </EuiFormRow>

        <EuiFormRow fullWidth label="Select and existing Elasticsearch index">
          <EuiSelect
            hasNoInitialSelection
            onChange={() => {}}
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
            aria-label="An example of a form element without a visible label"
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlexGroup>
  </EuiFlyoutBody>
);

export const ConnectFlyoutFooter: React.FC = () => (
  <EuiFlyoutFooter>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={() => {
            console.log('close flyout');
          }}
        >
          Cancel
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={() => {
            console.log('connect');
          }}
        >
          Connect to index
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlyoutFooter>
);
