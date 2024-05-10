/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useSearchParams } from 'react-router-dom-v5-compat';

import { useValues } from 'kea';

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { KibanaLogic } from '../../../shared/kibana';
import { EnterpriseSearchApplicationsPageTemplate } from '../layout/page_template';

export const Playground: React.FC = () => {
  const [searchParams] = useSearchParams();
  const index: string | null = searchParams.has('default-index')
    ? searchParams.get('default-index')
    : null;
  const { searchPlayground } = useValues(KibanaLogic);

  if (!searchPlayground) {
    return null;
  }
  return (
    <searchPlayground.PlaygroundProvider
      defaultValues={{
        indices: index ? [index] : [],
      }}
    >
      <EnterpriseSearchApplicationsPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.playground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.playground.headerTitle"
                  defaultMessage="Playground"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.playground.headerTitle.techPreview',
                    {
                      defaultMessage: 'TECH PREVIEW',
                    }
                  )}
                  color="hollow"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          rightSideItems: [<searchPlayground.PlaygroundToolbar />],
        }}
        pageViewTelemetry="Playground"
        restrictWidth={false}
        customPageSections
        bottomBorder="extended"
        docLink="playground"
      >
        <searchPlayground.Playground />
      </EnterpriseSearchApplicationsPageTemplate>
    </searchPlayground.PlaygroundProvider>
  );
};
