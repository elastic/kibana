/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiSpacer } from '@elastic/eui';

import { SelectedModel } from './selected_model';

interface Props {
  model: estypes.MlTrainedModelConfig;
  onClose: () => void;
}
export const TestTrainedModelFlyout: FC<Props> = ({ model, onClose }) => {
  return (
    <>
      <EuiFlyout maxWidth={600} onClose={onClose} data-test-subj="mlTestModelsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.headerLabel"
                defaultMessage="Test trained model"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTitle size="xs">
            <h4>{model.model_id}</h4>
          </EuiTitle>

          <EuiSpacer size="m" />

          <SelectedModel model={model} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};
