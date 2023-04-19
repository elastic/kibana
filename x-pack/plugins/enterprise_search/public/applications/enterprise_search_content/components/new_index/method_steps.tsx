/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiText } from '@elastic/eui';

import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_ELASTICSEARCH_URL } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { ENGINES_PATH } from '../../routes';

export const CREATE_ELASTICSEARCH_INDEX_STEP: EuiContainedStepProps = {
  children: (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.content.newIndex.steps.createIndex.content"
          defaultMessage="Provide a unique index name and optionally set a default {languageAnalyzerDocLink} for the index. This index will hold your data source content, and is optimized with default field mappings for relevant search experiences."
          values={{
            languageAnalyzerDocLink: (
              <EuiLink href={docLinks.languageAnalyzers} target="_blank" external>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.steps.createIndex.languageAnalyzerLink',
                  { defaultMessage: 'language analyzer' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  ),
  status: 'incomplete',
  title: i18n.translate('xpack.enterpriseSearch.content.newIndex.steps.createIndex.title', {
    defaultMessage: 'Create an Elasticsearch index',
  }),

  titleSize: 'xs',
};

export const BUILD_SEARCH_EXPERIENCE_STEP: EuiContainedStepProps = {
  children: (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.content"
          defaultMessage="After building your connector, your content is ready to create a {searchApplicationLink} with {elasticsearchLink}."
          values={{
            elasticsearchLink: (
              <EuiLinkTo to={ENTERPRISE_SEARCH_ELASTICSEARCH_URL} shouldNotCreateHref>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.elasticsearchLink',
                  { defaultMessage: 'Elasticsearch' }
                )}
              </EuiLinkTo>
            ),
            searchApplicationLink: (
              <EuiLink onClick={() => KibanaLogic.values.navigateToUrl(ENGINES_PATH)}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.searchApplicationLink',
                  { defaultMessage: 'Search Application' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  ),
  status: 'incomplete',
  title: i18n.translate(
    'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.title',
    {
      defaultMessage: 'Build a search experience',
    }
  ),
  titleSize: 'xs',
};
