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

interface Props {
  onClick: () => void;
  showNextButton: boolean;
  disableNextButton: boolean;
  nextButtonText: string;
  closeFlyout: () => void;
  hasPreviewLayers: boolean;
  isLoading: boolean;
}

export const FlyoutFooter = ({
  onClick,
  showNextButton,
  disableNextButton,
  nextButtonText,
  closeFlyout,
  hasPreviewLayers,
  isLoading,
}: Props) => {
  const nextButton = showNextButton ? (
    <EuiButton
      data-test-subj="importFileButton"
      disabled={disableNextButton || !hasPreviewLayers || isLoading}
      isLoading={isLoading}
      iconSide="right"
      iconType={'sortRight'}
      onClick={onClick}
      fill
    >
      {nextButtonText}
    </EuiButton>
  ) : null;

  return (
    <EuiFlyoutFooter className="mapLayerPanel__footer">
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={closeFlyout} flush="left" data-test-subj="layerAddCancelButton">
            <FormattedMessage
              id="xpack.maps.addLayerPanel.footer.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{nextButton}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
