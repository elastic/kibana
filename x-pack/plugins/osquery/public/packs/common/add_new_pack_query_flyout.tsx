/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';

import { SavedQueryForm } from '../../saved_queries/form';

// @ts-expect-error update types
const AddNewPackQueryFlyoutComponent = ({ handleClose, handleSubmit }) => (
  <EuiFlyout ownFocus onClose={handleClose} aria-labelledby="flyoutTitle">
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="flyoutTitle">{'Add new Saved Query'}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      {
        // @ts-expect-error update types
        <SavedQueryForm handleSubmit={handleSubmit} />
      }
    </EuiFlyoutBody>
  </EuiFlyout>
);

export const AddNewPackQueryFlyout = React.memo(AddNewPackQueryFlyoutComponent);
