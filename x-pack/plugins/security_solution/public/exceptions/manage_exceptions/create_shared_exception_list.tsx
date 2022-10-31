/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiFieldText,
  EuiSpacer,
  EuiTextArea,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
} from '@elastic/eui';

export const CreateSharedListFlyout = memo(
  ({ handleCloseFlyout }: { handleCloseFlyout: () => void }) => {
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');

    const onListNameChange = (e) => {
      setListName(e.target.value);
    };
    const onDescriptionChange = (e) => {
      setDescription(e.target.value);
    };
    return (
      <EuiFlyout
        ownFocus
        size="s"
        onClose={handleCloseFlyout}
        data-test-subj="createSharedExceptionListFlyout"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 data-test-subj="createSharedExceptionListTitle">{'hello world!'}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>{'Shared exception list name'}</EuiText>
          <EuiFieldText
            placeholder="New exception list"
            value={listName}
            onChange={(e) => onListNameChange(e)}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiSpacer />
          <EuiText>{'Description (optional)'}</EuiText>
          <EuiTextArea
            placeholder="New exception list"
            value={description}
            onChange={(e) => onDescriptionChange(e)}
            aria-label="Stop the hackers"
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={handleCloseFlyout} flush="left">
                {'Close'}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="exception-lists-form-create-shared"
                onClick={() => console.error({ listName, description })}
                disabled={listName === ''}
              >
                {'Create shared exception list'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

CreateSharedListFlyout.displayName = 'CreateSharedListFlyout';
