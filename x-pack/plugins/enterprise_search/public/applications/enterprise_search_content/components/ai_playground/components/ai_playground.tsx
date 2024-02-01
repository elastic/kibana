/*
 *
 *  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 *  * or more contributor license agreements. Licensed under the Elastic License
 *  * 2.0; you may not use this file except in compliance with the Elastic License
 *  * 2.0.
 *
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate, useEuiTheme } from '@elastic/eui';

import { EnterpriseSearchContentPageTemplate } from '../../layout/page_template';
import { AIPlaygroundSidebar } from './ai_playground_sidebar';

export const AIPlayground: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.content.aiPlayground.breadcrumb', {
          defaultMessage: 'AI Playground',
        }),
      ]}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.aiPlayground.headerTitle', {
          defaultMessage: 'AI Playground',
        }),
        rightSideItems: [],
      }}
      pageViewTelemetry="AI Playground"
      isLoading={false}
      customPageSections
      bottomBorder="extended"
    >
      <EuiPageTemplate.Section
        alignment="top"
        restrictWidth={false}
        grow
        contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
        paddingSize="none"
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem
            grow={2}
            css={{
              borderRight: euiTheme.border.thin,
              padding: euiTheme.size.l,
            }}
          >
            <EuiFlexGroup direction="column" justifyContent="spaceBetween"></EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem
            grow={1}
            css={{
              padding: euiTheme.size.l,
            }}
          >
            <AIPlaygroundSidebar />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EnterpriseSearchContentPageTemplate>
  );
};
