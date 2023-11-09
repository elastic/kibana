/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ModelItem } from '../models_list';
import { TestTrainedModelFlyoutContent } from '../test_models/test_flyout';
import { useMlKibana } from '../../contexts/kibana';

interface ContentProps {
  model: ModelItem;
}

export const TestTrainedModel: FC<ContentProps> = ({ model }) => {
  const {
    services: {
      docLinks: { links },
    },
  } = useMlKibana();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={3}>
        <EuiTitle size="s">
          <h4>
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.testTrainedModelTitle',
              { defaultMessage: 'Try it out' }
            )}
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.testTrainedModelExplanation"
              defaultMessage="Test the model to ensure it's working properly."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.testTrainedModelDescription"
              defaultMessage="Test the model against new data by either providing some input text or use a field of an existing index. Alternatively, you can use the infer trained model API. {inferTrainedModelApiLink}."
              values={{
                inferTrainedModelApiLink: (
                  <EuiLink external target="_blank" href={links.apis.inferTrainedModel}>
                    Learn more.
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <TestTrainedModelFlyoutContent model={model} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
