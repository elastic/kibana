/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface Props {
  cancelLayerPanel: () => void;
  saveLayerEdits: () => void;
  removeLayer: () => void;
  hasStateChanged: boolean;
}

export const FlyoutFooter = ({
  cancelLayerPanel,
  saveLayerEdits,
  removeLayer,
  hasStateChanged,
}: Props) => {
  const removeBtn = (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        color="danger"
        onClick={removeLayer}
        flush="right"
        data-test-subj="mapRemoveLayerButton"
      >
        <FormattedMessage
          id="xpack.maps.layerPanel.footer.removeLayerButtonLabel"
          defaultMessage="Remove layer"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
  );

  const cancelButtonLabel = hasStateChanged ? (
    <FormattedMessage id="xpack.maps.layerPanel.footer.cancelButtonLabel" defaultMessage="Cancel" />
  ) : (
    <FormattedMessage id="xpack.maps.layerPanel.footer.closeButtonLabel" defaultMessage="Close" />
  );

  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={cancelLayerPanel}
          flush="left"
          data-test-subj="layerPanelCancelButton"
        >
          {cancelButtonLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer />
      </EuiFlexItem>
      {removeBtn}
      <EuiFlexItem grow={false}>
        <EuiButton disabled={!hasStateChanged} iconType="check" onClick={saveLayerEdits} fill>
          <FormattedMessage
            id="xpack.maps.layerPanel.footer.saveAndCloseButtonLabel"
            defaultMessage="Save & close"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
