/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import * as i18n from '../../common/translations';
import { useKibana } from '../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';

export const InferenceEndpointsHeader: React.FC = () => {
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
    <EuiPageTemplate.Header
      css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={i18n.INFERENCE_ENDPOINT_LABEL}
      description={i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
      bottomBorder={true}
      rightSideItems={[
        <EuiFlexGroup>
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
        </EuiFlexGroup>,
      ]}
    />
  );
};
