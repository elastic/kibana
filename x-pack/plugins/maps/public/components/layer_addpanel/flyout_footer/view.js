/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const FlyoutFooter = (
  { onClick, disableButton, buttonText, closeFlyout, hasLayerSelected, isLoading }
) => {

  const nextButtonText = buttonText || 'Add layer';
  const nextButton = (
    <EuiButton
      disabled={!hasLayerSelected || disableButton}
      isLoading={hasLayerSelected && isLoading}
      iconSide="right"
      iconType={'sortRight'}
      onClick={onClick}
      fill
    >
      <FormattedMessage
        id="xpack.maps.addLayerPanel.addLayerButtonLabel"
        defaultMessage="{nextButtonText}"
        values={{ nextButtonText }}
      />
    </EuiButton>
  );

  return (
    <EuiFlyoutFooter className="mapLayerPanel__footer">
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={closeFlyout}
            flush="left"
            data-test-subj="layerAddCancelButton"
          >
            <FormattedMessage
              id="xpack.maps.addLayerPanel.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {nextButton}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
