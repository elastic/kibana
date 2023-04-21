/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ANALYTICS_PLUGIN } from '../../../../../../common/constants';
import { COLLECTION_INTEGRATE_PATH } from '../../../../analytics/routes';
import { docLinks } from '../../../../shared/doc_links';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { getEnterpriseSearchUrl } from '../../../../shared/enterprise_search_url';
import { KibanaLogic } from '../../../../shared/kibana';

import { EngineViewLogic } from '../engine_view_logic';

import { EngineApiIntegrationStage } from './engine_api_integration';
import { EngineApiLogic } from './engine_api_logic';
import { GenerateEngineApiKeyModal } from './generate_engine_api_key_modal/generate_engine_api_key_modal';

export const SearchApplicationAPI = () => {
  const { engineName } = useValues(EngineViewLogic);
  const { isGenerateModalOpen } = useValues(EngineApiLogic);
  const { openGenerateModal, closeGenerateModal } = useActions(EngineApiLogic);
  const enterpriseSearchUrl = getEnterpriseSearchUrl();
  const { navigateToUrl } = useValues(KibanaLogic);

  const steps = [
    {
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.title', {
        defaultMessage: 'Generate and save API key',
      }),
      children: (
        <>
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.apiKeyWarning', {
                defaultMessage:
                  "Elastic does not store API keys. Once generated, you'll only be able to view the key one time. Make sure you save it somewhere secure. If you lose access to it you'll need to generate a new API key from this screen.",
              })}{' '}
              <EuiLink
                href={docLinks.apiKeys}
                data-telemetry-id="entSearchContent-engines-api-step1-learnMoreLink"
                external
                target="_blank"
              >
                {i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.learnMoreLink', {
                  defaultMessage: 'Learn more about API keys.',
                })}
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="left"
                iconType="plusInCircleFilled"
                onClick={openGenerateModal}
                data-telemetry-id="entSearchContent-engines-api-step1-createApiKeyButton"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.engine.api.step1.createAPIKeyButton',
                  {
                    defaultMessage: 'Create API Key',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="left"
                iconType="popout"
                data-telemetry-id="entSearchContent-engines-api-step1-viewKeysButton"
                onClick={() =>
                  KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                    shouldNotCreateHref: true,
                  })
                }
              >
                {i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.viewKeysButton', {
                  defaultMessage: 'View Keys',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step2.title', {
        defaultMessage: "Copy your engine's endpoint",
      }),
      children: (
        <>
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.api.step2.copyEndpointDescription',
                {
                  defaultMessage: "Use this URL to access your engine's API endpoints.",
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiCodeBlock language="markup" fontSize="m" paddingSize="m" isCopyable>
                {enterpriseSearchUrl}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.title', {
        defaultMessage: 'Learn how to call your endpoints',
      }),
      children: <EngineApiIntegrationStage />,
    },
    {
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step4.title', {
        defaultMessage: '(Optional) Power up your analytics',
      }),
      children: (
        <>
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.content.engine.api.step4.copy', {
                defaultMessage:
                  'Your engine provides basic analytics data as part of this installation. To receive more granular and custom metrics, integrate our Behavioral Analytics script on your platform.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-telemetry-id="entSearchContent-engines-api-step4-learnHowLink"
                onClick={() =>
                  navigateToUrl(
                    generateEncodedPath(`${ANALYTICS_PLUGIN.URL}${COLLECTION_INTEGRATE_PATH}`, {
                      id: engineName,
                    }),
                    { shouldNotCreateHref: true }
                  )
                }
                iconSide="left"
                iconType="popout"
              >
                {i18n.translate('xpack.enterpriseSearch.content.engine.api.step4.learnHowLink', {
                  defaultMessage: 'Learn how',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];

  return (
    <>
      {isGenerateModalOpen ? (
        <GenerateEngineApiKeyModal engineName={engineName} onClose={closeGenerateModal} />
      ) : null}
      <EuiSteps headingElement="h2" steps={steps} />
    </>
  );
};
