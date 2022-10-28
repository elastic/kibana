/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiImage, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import noMlModelsGraphicDark from '../../../../../../assets/images/no_ml_models_dark.svg';
import noMlModelsGraphicLight from '../../../../../../assets/images/no_ml_models_light.svg';

import { docLinks } from '../../../../../shared/doc_links';

export const NoModelsPanel: React.FC = () => {
  const { colorMode } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      body={
        <>
          <EuiImage
            size="xl"
            src={colorMode === 'LIGHT' ? noMlModelsGraphicLight : noMlModelsGraphicDark}
            alt={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.noModels.imageAlt',
              { defaultMessage: 'No ml models illustration' }
            )}
          />
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.noModels.description',
                {
                  defaultMessage:
                    'You have no trained models available. Please follow the documenation to add trained ml models to your cluster.',
                }
              )}
            </p>
          </EuiText>
        </>
      }
      footer={
        <EuiLink href={docLinks.deployTrainedModels} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTable.emptyPrompt.docsLink',
            {
              defaultMessage: 'Learn More',
            }
          )}
        </EuiLink>
      }
    />
  );
};
