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

import { docLinks } from '../doc_links';

interface DeprecationCalloutProps {
  onDismissAction: () => void;
  restrictWidth?: boolean;
}

export const EnterpriseSearchDeprecationCallout: React.FC<DeprecationCalloutProps> = ({
  onDismissAction,
  restrictWidth = false,
}) => {
  const maxWidth = restrictWidth ? '75%' : '100%';
  const cssStyles = {
    maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: '16px',
    marginBottom: '16px',
  };
  return (
    <div style={cssStyles}>
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
          defaultMessage="The standalone Enterprise Search product, including App Search and Workplace Search, remains available in maintenance mode, but are not recommended for new search experiences. Instead, we recommend using our actively developed Elasticsearch-native tools. These tools offer the flexibility and composability of working directly with Elasticsearch indices."
        />
        <EuiSpacer size="s" />
        <FormattedMessage
          id="xpack.enterpriseSearch.deprecationCallout.second_message"
          defaultMessage="See this {workplaceSearchBlogUrl} for more information about upgrading your internal knowledge search or this {appSearchBlogUrl} about upgrading your catalog search."
          values={{
            workplaceSearchBlogUrl: (
              <EuiLink
                data-test-subj="workplaceSearch-deprecationCallout-blog-link"
                href={docLinks.workplaceSearchEvolutionBlog}
                target="_blank"
                data-telemetry-id="workplaceSearch-deprecationCallout-blog-viewLink"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.deprecationCallout.viewWorkplaceSearchBlog',
                  {
                    defaultMessage: 'blog post',
                  }
                )}
              </EuiLink>
            ),
            appSearchBlogUrl: (
              <EuiLink
                data-test-subj="appSearch-deprecationCallout-blog-link"
                href={docLinks.appSearchEvolutionBlog}
                target="_blank"
                data-telemetry-id="appSearch-deprecationCallout-blog-viewLink"
              >
                {i18n.translate('xpack.enterpriseSearch.deprecationCallout.viewAppSearchBlog', {
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
              href={docLinks.appSearchEvolutionBlog}
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
    </div>
  );
};
