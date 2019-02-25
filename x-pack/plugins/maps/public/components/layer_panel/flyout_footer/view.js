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
import { FormattedMessage } from '@kbn/i18n/react';



export const FlyoutFooter = ({ cancelLayerPanel, saveLayerEdits, removeLayer,
  hasStateChanged }) => {
  const removeBtn = (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        color="danger"
        onClick={removeLayer}
        flush="right"
        data-test-subj="mapRemoveLayerButton"
      >
        <FormattedMessage
          id="xpack.maps.layerPanel.footer.removeLayer"
          defaultMessage="Remove layer"
        />
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
          {hasStateChanged ? 'Cancel' : 'Close'}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer/>
      </EuiFlexItem>
      {removeBtn}
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={!hasStateChanged}
          iconType="check"
          onClick={saveLayerEdits}
          fill
        >
          Save &amp; close
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
