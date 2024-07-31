/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { InvestigateView } from '../../components/investigate_view';
import { useKibana } from '../../hooks/use_kibana';

export function InvestigateDetailsPage() {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
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
      <InvestigateView />
    </ObservabilityPageTemplate>
  );
}
