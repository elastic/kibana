/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { UploadModel } from './upload_model';
import logo from './huggingface_logo.svg';

interface Props {
  onClose: () => void;
}
export const UploadTrainedModelFlyout: FC<Props> = ({ onClose }) => {
  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose} data-test-subj="mlTestModelsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <img src={logo} alt="huggin face" width="35px" />
              </EuiFlexItem>
              <EuiFlexItem>
                <h2>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.headerLabel"
                    defaultMessage="Import model from Hugging Face"
                  />
                </h2>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <UploadModel onClose={onClose} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};
