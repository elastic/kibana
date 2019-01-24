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
  isNewLayer }) => {
  const removeBtn = isNewLayer
    ? null
    : (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="danger"
          onClick={removeLayer}
          flush="right"
          data-test-subj="mapRemoveLayerButton"
        >
          Remove layer
        </EuiButtonEmpty>
      </EuiFlexItem>
    );

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
          onClick={() => saveLayerEdits(isNewLayer)}
          fill
        >
          Save &amp; close
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
