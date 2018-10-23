/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
export const FlyoutFooter = ({ cancelLayerPanel, saveLayerEdits, removeLayer,
  showRemoveBtn }) => {
  const removeBtn = showRemoveBtn
    ? (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="danger"
          onClick={removeLayer}
          flush="right"
        >
          Remove layer
        </EuiButtonEmpty>
      </EuiFlexItem>
    )
    : null;

  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={cancelLayerPanel}
          flush="left"
        >
          Cancel
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer/>
      </EuiFlexItem>
      {removeBtn}
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="check"
          onClick={saveLayerEdits}
          fill
        >
          Save &amp; Close
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};