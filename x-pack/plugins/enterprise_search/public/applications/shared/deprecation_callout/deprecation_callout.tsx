/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiButton, EuiLink, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface DeprecationCalloutProps {
  onDismissAction: () => void;
}

export const EnterpriseSearchDeprecationCallout: React.FC<DeprecationCalloutProps> = ({
  onDismissAction,
}) => {
  return (
    <EuiCallOut
      onDismiss={onDismissAction}
      iconType={'warning'}
      color={'warning'}
      title={i18n.translate(
        'xpack.enterpriseSearch.enterpriseSearchDeprecationCallout.euiCallOut.title',
        { defaultMessage: 'Important Note' }
      )}
      data-test-subj="EnterpriseSearchDeprecationCallout"
    >
      <FormattedMessage
        id="xpack.enterpriseSearch.deprecationCallout.first_message"
        defaultMessage="The standalone App Search and Workplace Search products remain available in maintenance mode, and are not recommended for new search experiences. Instead, we recommend using our Elasticsearch-native tools which we are actively developing and improving, for your search use cases. These tools offer the flexibility and composability of working directly with Elasticsearch indices."
      />
      <EuiSpacer size="s" />
      <FormattedMessage
        id="xpack.enterpriseSearch.deprecationCallout.second_message"
        defaultMessage="See this {blogUrl} for more information about upgrading your internal knowledge search or this blog post about upgrading your catalog search."
        values={{
          blogUrl: (
            <EuiLink
              data-test-subj="workplaceSearch-deprecationCallout-blog-link"
              href="https://www.elastic.co/search-labs/blog/evolution-app-search-elasticsearch"
              target="_blank"
              data-telemetry-id="workplaceSearch-deprecationCallout-blog-viewLink"
            >
              {i18n.translate('xpack.enterpriseSearch.deprecationCallout.viewBlog', {
                defaultMessage: 'blog post',
              })}
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButton
            href="https://www.elastic.co/search-labs/blog/evolution-app-search-elasticsearch"
            color="warning"
            iconType="popout"
            iconSide="right"
            target="_blank"
            data-test-subj="ent-search-deprecation-callout-cta"
            fill
          >
            Learn more
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            target="_blank"
            onClick={onDismissAction}
            color="warning"
            data-test-subj="dismiss-ent-search-deprecation-callout"
          >
            {i18n.translate('xpack.enterpriseSearch.deprecationCallout.dissmissLink', {
              defaultMessage: 'Dismiss',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
