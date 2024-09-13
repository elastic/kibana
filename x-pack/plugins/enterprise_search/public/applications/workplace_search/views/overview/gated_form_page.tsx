/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';

import { docLinks } from '../../../shared/doc_links';
import {
  EnterpriseSearchPageTemplateWrapper,
  PageTemplateProps,
  useEnterpriseSearchNav,
} from '../../../shared/layout';
import { SendWorkplaceSearchTelemetry } from '../../../shared/telemetry';

import { WorkplaceSearchGate } from './gated_form';

export const WorkplaceSearchGatePage: React.FC<PageTemplateProps> = ({ isLoading }) => {
  return (
    <EnterpriseSearchPageTemplateWrapper
      restrictWidth
      pageHeader={{
        description: (
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.gateForm.description"
            defaultMessage="The standalone Workplace Search product remains available in maintenance mode, and is not recommended for new search experiences. Instead, we recommend using our set of Elasticsearch-native tools, which our team is actively developing and improving, for your workplace search use case. These tools offer the flexibility and composability of working directly with Elasticsearch indices. Learn more about the context for this refocus in this {blogUrl}. To help choose which of these tools best suit your use case, we’ve created this recommendation wizard. Let us know what features you need, and we'll guide you to the best solutions. If you still want to go ahead and use the standalone Workplace Search product at this point, you can do so after submitting the form."
            values={{
              blogUrl: (
                <EuiLink
                  data-test-subj="workplaceSearch-gateForm-blog-link"
                  href={docLinks.workplaceSearchGatedFormBlog}
                  target="_blank"
                  data-telemetry-id="workplaceSearch-gateForm-blog-viewLink"
                >
                  {i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.viewBlog', {
                    defaultMessage: 'blog',
                  })}
                </EuiLink>
              ),
            }}
          />
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.workplaceSearch.gateForm.title', {
          defaultMessage: 'Before you begin...',
        }),
      }}
      solutionNav={{
        items: useEnterpriseSearchNav(),
        name: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME,
      }}
      isLoading={isLoading}
      hideEmbeddedConsole
    >
      <SendWorkplaceSearchTelemetry action="viewed" metric="Workplace Search Gate form" />

      <WorkplaceSearchGate />
    </EnterpriseSearchPageTemplateWrapper>
  );
};
