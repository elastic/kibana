/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { TrainedModelItem } from '../../../../common/types/trained_models';
import { TestTrainedModelContent } from './test_trained_model_content';

interface Props {
  model: TrainedModelItem;
  onClose: () => void;
}
export const TestTrainedModelFlyout: FC<Props> = ({ model, onClose }) => (
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
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>{model.model_id}</h4>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <TestTrainedModelContent model={model} />
    </EuiFlyoutBody>
  </EuiFlyout>
);
