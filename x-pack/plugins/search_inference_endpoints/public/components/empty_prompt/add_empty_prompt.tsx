/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { docLinks } from '../../../common/doc_links';

import * as i18n from '../../../common/translations';

import inferenceEndpoint from '../../assets/images/inference_endpoint.svg';

import { EndpointPrompt } from './endpoint_prompt';
import { useKibana } from '../../hooks/use_kibana';

import './add_empty_prompt.scss';

interface AddEmptyPromptProps {
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const AddEmptyPrompt: React.FC<AddEmptyPromptProps> = ({ setIsInferenceFlyoutVisible }) => {
  const {
    services: { ml },
  } = useKibana();

  const [trainedModelPageUrl, setTrainedModelPageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchMlTrainedModelPageUrl = async () => {
      const url = await ml?.locator?.getUrl({
        page: 'trained_models',
      });
      setTrainedModelPageUrl(url);
    };

    fetchMlTrainedModelPageUrl();
  }, [ml]);

  return (
    <EuiPageTemplate.EmptyPrompt
      layout="horizontal"
      restrictWidth
      color="plain"
      hasShadow
      icon={<EuiImage size="fullWidth" src={inferenceEndpoint} alt="" />}
      title={<h2>{i18n.INFERENCE_ENDPOINT_LABEL}</h2>}
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem data-test-subj="createFirstInferenceEndpointDescription">
            {i18n.CREATE_FIRST_INFERENCE_ENDPOINT_DESCRIPTION}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink
              href={docLinks.createInferenceEndpoint}
              target="_blank"
              data-test-subj="learn-more-about-inference-endpoints"
            >
              {i18n.LEARN_MORE_ABOUT_INFERENCE_ENDPOINTS_LINK}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink href={trainedModelPageUrl} target="_blank" data-test-subj="view-your-models">
              {i18n.VIEW_YOUR_MODELS_LINK}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      footer={
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <strong>{i18n.START_WITH_PREPARED_ENDPOINTS_LABEL}</strong>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EndpointPrompt
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
                title={i18n.ELSER_TITLE}
                description={i18n.ELSER_DESCRIPTION}
                footer={
                  <EuiButton
                    iconType="plusInCircle"
                    onClick={() => setIsInferenceFlyoutVisible(true)}
                  >
                    {i18n.ADD_ENDPOINT_LABEL}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EndpointPrompt
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
                title={i18n.E5_TITLE}
                description={i18n.E5_DESCRIPTION}
                footer={
                  <EuiButton
                    iconType="plusInCircle"
                    onClick={() => setIsInferenceFlyoutVisible(true)}
                  >
                    {i18n.ADD_ENDPOINT_LABEL}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      }
    />
  );
};
