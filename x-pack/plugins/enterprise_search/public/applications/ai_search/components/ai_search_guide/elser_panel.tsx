/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { NEW_INDEX_PATH } from '../../../enterprise_search_content/routes';
import { docLinks } from '../../../shared/doc_links';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

export const ElserPanel: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.aiSearch.elser.description"
              defaultMessage="The {elser} enables textual semantic search over your Elasticsearch documents in just a few commands. Use the 'semantic_text' field to simplify model deployment and generate sparse vector document embeddings."
              values={{
                elser: (
                  <EuiLink
                    data-test-subj="enterpriseSearchElserPanelElasticLearnedSparseEncoderV2Link"
                    target="_blank"
                    href={docLinks.elser}
                    external={false}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.aiSearch.elser.description.elserLinkText',
                      {
                        defaultMessage: 'Elastic Learned Sparse Encoder v2',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLinkTo
          to={generatePath(ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + NEW_INDEX_PATH)}
          shouldNotCreateHref
        >
          <EuiButton
            data-test-subj="enterpriseSearchElserPanelSetupSemanticSearchButton"
            data-telemetry-id="entSearch-aiSearch-semanticSearch-elserPanel-setupSemanticSearch"
          >
            {i18n.translate('xpack.enterpriseSearch.aiSearch.elserPanel.buttonLabel', {
              defaultMessage: 'Set up Semantic Search',
            })}
          </EuiButton>
        </EuiLinkTo>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
