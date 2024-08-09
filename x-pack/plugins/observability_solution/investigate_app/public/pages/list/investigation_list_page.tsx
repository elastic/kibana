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
import { paths } from '../../../common/paths';

export function InvestigationListPage() {
  const {
    core: {
      http: { basePath },
    },
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        breadcrumbs: [
          {
            text: i18n.translate('xpack.investigateApp.listPage.breadcrumb.list', {
              defaultMessage: 'Investigations',
            }),
          },
        ],
        pageTitle: i18n.translate('xpack.investigateApp.listPage.title', {
          defaultMessage: 'Investigations',
        }),
        rightSideItems: [
          <EuiButton
            data-test-subj="investigateAppInvestigationListPageCreateButton"
            fill
            href={basePath.prepend(paths.create)}
          >
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
