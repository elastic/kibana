/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { paths } from '../../../common/paths';
import { useKibana } from '../../hooks/use_kibana';
import { InvestigationDetails } from './components/investigation_details';

export function InvestigationDetailsPage() {
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
            href: basePath.prepend(paths.investigations),
            text: i18n.translate('xpack.investigateApp.detailsPage.breadcrumb.list', {
              defaultMessage: 'Investigations',
            }),
          },
          {
            text: i18n.translate('xpack.investigateApp.detailsPage.breadcrumb.details', {
              defaultMessage: 'Investigation details',
            }),
          },
        ],
        pageTitle: i18n.translate('xpack.investigateApp.detailsPage.title', {
          defaultMessage: 'New investigation',
        }),
        rightSideItems: [
          <EuiButton fill data-test-subj="investigateAppInvestigateDetailsPageEscalateButton">
            {i18n.translate('xpack.investigateApp.investigateDetailsPage.escalateButtonLabel', {
              defaultMessage: 'Escalate',
            })}
          </EuiButton>,
        ],
      }}
    >
      <InvestigationDetails />
    </ObservabilityPageTemplate>
  );
}
