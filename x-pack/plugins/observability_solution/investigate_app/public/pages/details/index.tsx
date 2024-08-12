/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_RULE_CATEGORY } from '@kbn/rule-data-utils/src/default_alerts_as_data';
import { InvestigateView } from '../../components/investigate_view';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchInvestigation } from '../../hooks/use_get_investigation_details';
import { useInvestigateParams } from '../../hooks/use_investigate_params';
import { useFetchAlert } from '../../hooks/use_get_alert_details';

export function InvestigateDetailsPage() {
  const {
    core: {
      http: { basePath },
    },
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const {
    path: { id },
  } = useInvestigateParams('/{id}');

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const {
    data: investigationDetails,
    isLoading: isFetchInvestigationLoading,
    isError: isFetchInvestigationError,
  } = useFetchInvestigation({ id });

  const alertId = investigationDetails?.origin.id ?? '';

  const {
    data: alertDetails,
    isLoading: isFetchAlertLoading,
    isError: isFetchAlertError,
  } = useFetchAlert({ id: alertId });

  if (isFetchInvestigationLoading || isFetchAlertLoading) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.fetchInvestigation.loadingLabel', {
          defaultMessage: 'Loading...',
        })}
      </h1>
    );
  }

  if (isFetchInvestigationError || isFetchAlertError) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.fetchInvestigation.errorLabel', {
          defaultMessage: 'Error while fetching investigation',
        })}
      </h1>
    );
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            {alertDetails && (
              <EuiButtonEmpty
                data-test-subj="investigationDetailsAlertLink"
                iconType="arrowLeft"
                size="xs"
                href={basePath.prepend(`/app/observability/alerts/${alertId}`)}
              >
                <EuiText size="s">
                  {`[Alert] ${alertDetails?.[ALERT_RULE_CATEGORY]} breached`}
                </EuiText>
              </EuiButtonEmpty>
            )}
            {investigationDetails && <div>{investigationDetails.title}</div>}
          </>
        ),
        rightSideItems: [
          <EuiButton fill data-test-subj="investigationDetailsEscalateButton">
            {i18n.translate('xpack.investigateApp.investigationDetails.escalateButtonLabel', {
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
