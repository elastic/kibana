/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { alertOriginSchema } from '@kbn/investigation-shared';
import { ALERT_RULE_CATEGORY } from '@kbn/rule-data-utils/src/default_alerts_as_data';
import React from 'react';
import { useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { paths } from '../../../common/paths';
import { useFetchInvestigation } from '../../hooks/use_fetch_investigation';
import { useFetchAlert } from '../../hooks/use_get_alert_details';
import { useKibana } from '../../hooks/use_kibana';
import { InvestigationDetails } from './components/investigation_details/investigation_details';
import { InvestigationProvider } from './contexts/investigation_context';
import { InvestigationDetailsPathParams } from './types';

export function InvestigationDetailsPage() {
  const {
    core: {
      http: { basePath },
      security,
    },
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const user = useAsync(() => {
    return security.authc.getCurrentUser();
  }, [security]);

  const { investigationId } = useParams<InvestigationDetailsPathParams>();

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const {
    data: investigation,
    isLoading: isFetchInvestigationLoading,
    isError: isFetchInvestigationError,
  } = useFetchInvestigation({ id: investigationId });

  const alertOriginInvestigation = alertOriginSchema.safeParse(investigation?.origin);
  const alertId = alertOriginInvestigation.success ? alertOriginInvestigation.data.id : undefined;

  const { data: alertDetails } = useFetchAlert({ id: alertId });

  if (!user.value) {
    return null;
  }

  if (isFetchInvestigationLoading || investigation === undefined) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.fetchInvestigation.loadingLabel', {
          defaultMessage: 'Loading...',
        })}
      </h1>
    );
  }

  if (isFetchInvestigationError) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.fetchInvestigation.errorLabel', {
          defaultMessage: 'Error while fetching investigation',
        })}
      </h1>
    );
  }

  return (
    <InvestigationProvider initialInvestigation={investigation}>
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
              {investigation && <div>{investigation.title}</div>}
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
        <InvestigationDetails user={user.value} />
      </ObservabilityPageTemplate>
    </InvestigationProvider>
  );
}
