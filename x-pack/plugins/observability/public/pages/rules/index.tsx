/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiHorizontalRule,
  EuiAutoRefreshButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

import { useKibana } from '../../utils/kibana_react';

export function RulesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { docLinks } = useKibana().services;

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
  ]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>{i18n.translate('xpack.observability.rulesTitle', { defaultMessage: 'Rules' })} </>
        ),
        rightSideItems: [
          <EuiButtonEmpty
            href={docLinks.links.alerting.guide}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.observability.rules.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ],
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="totalAlertsCount" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiAutoRefreshButton
            isPaused={false}
            refreshInterval={3000}
            onRefreshChange={() => {}}
            shortHand
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem />
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
