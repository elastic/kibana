/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { InvestigationList } from './components/investigation_list';

export function InvestigationListPage() {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.investigateApp.listPage.title', {
          defaultMessage: 'Investigations',
        }),
        rightSideItems: [
          <EuiButton data-test-subj="investigateAppInvestigationListPageCreateButton" fill>
            {i18n.translate('xpack.investigateApp.investigationListPage.createButtonLabel', {
              defaultMessage: 'Create',
            })}
          </EuiButton>,
        ],
      }}
    >
      <InvestigationList />
    </ObservabilityPageTemplate>
  );
}
