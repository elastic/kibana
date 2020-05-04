/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiOverlayMask,
  EuiTitle,
} from '@elastic/eui';

import { TransformPivotConfig } from '../../../../common';

import { EditTransformFlyoutCallout } from './edit_transform_flyout_callout';
import { EditTransformFlyoutForm } from './edit_transform_flyout_form';

interface EditTransformFlyoutProps {
  closeFlyout: () => void;
  config: TransformPivotConfig;
}

export const EditTransformFlyout: FC<EditTransformFlyoutProps> = ({ closeFlyout, config }) => {
  // When the transform is updated, a series of validations occur to ensure its success. You can use the defer_validation parameter to skip these checks.

  // All updated properties except description do not take effect until after the transform starts the next checkpoint. This is so there is consistency with the pivoted data in each checkpoint.',

  return (
    <EuiOverlayMask>
      <EuiFlyout onClose={closeFlyout} hideCloseButton aria-labelledby="flyoutComplicatedTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutComplicatedTitle">
              {i18n.translate('xpack.transform.transformList.editFlyoutTitle', {
                defaultMessage: 'Edit {transformId}',
                values: {
                  transformId: config.id,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody banner={<EditTransformFlyoutCallout />}>
          <EditTransformFlyoutForm config={config} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {i18n.translate('xpack.transform.transformList.editFlyoutCloseButtonText', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={closeFlyout} fill>
                {i18n.translate('xpack.transform.transformList.editFlyoutUpdateButtonText', {
                  defaultMessage: 'Update',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiOverlayMask>
  );
};
