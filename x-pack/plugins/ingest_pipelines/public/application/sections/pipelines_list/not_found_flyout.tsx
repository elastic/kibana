/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiIcon,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

interface Props {
  onClose: () => void;
}

export const PipelineNotFoundFlyout: FunctionComponent<Props> = ({ onClose }) => {
  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={550}>
      <EuiFlyoutBody>
        <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="alert" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.ingestPipelines.list.notFoundFlyoutMessage"
                  defaultMessage="Pipeline not found"
                />
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
