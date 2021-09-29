/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, Suspense } from 'react';
import {
  casesBreadcrumbs,
  getCaseDetailsUrl,
  getCaseDetailsUrlWithCommentId,
  getCaseUrl,
  getConfigureCasesUrl,
  useFormatUrl,
} from '../../../../pages/cases/links';
import { Case } from '../../../../../../cases/common';
import { useFetchAlertData, useFetchAlertDetail } from './helpers';
import { useKibana } from '../../../../utils/kibana_react';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { observabilityAppId } from '../../../../../common';
import { LazyAlertsFlyout } from '../../../..';

interface Props {
  caseId: string;
  subCaseId?: string;
  userCanCrud: boolean;
}

export interface OnUpdateFields {
  key: keyof Case;
  value: Case[keyof Case];
  onSuccess?: () => void;
  onError?: () => void;
}

export interface CaseProps extends Props {
  fetchCase: () => void;
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

export const CaseView = React.memo(({ caseId, subCaseId, userCanCrud }: Props) => {
  const [caseTitle, setCaseTitle] = useState<string | null>(null);
  const { observabilityRuleTypeRegistry } = usePluginContext();

  const {
    cases: casesUi,
    application: { getUrlForApp, navigateToUrl, navigateToApp },
  } = useKibana().services;
  const allCasesLink = getCaseUrl();
  const { formatUrl } = useFormatUrl();
  const href = formatUrl(allCasesLink);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');

  useBreadcrumbs([
    { ...casesBreadcrumbs.cases, href },
    ...(caseTitle !== null
      ? [
          {
            text: caseTitle,
          },
        ]
      : []),
  ]);

  const onCaseDataSuccess = useCallback(
    (data: Case) => {
      if (caseTitle === null || caseTitle !== data.title) {
        setCaseTitle(data.title);
      }
    },
    [caseTitle]
  );

  const configureCasesLink = getConfigureCasesUrl();
  const allCasesHref = href;
  const configureCasesHref = formatUrl(configureCasesLink);
  const caseDetailsHref = formatUrl(getCaseDetailsUrl({ id: caseId }), { absolute: true });
  const getCaseDetailHrefWithCommentId = useCallback(
    (commentId: string) =>
      formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
        absolute: true,
      }),
    [caseId, formatUrl, subCaseId]
  );
  const casesUrl = `${getUrlForApp(observabilityAppId)}/cases`;

  const handleFlyoutClose = useCallback(() => {
    setSelectedAlertId('');
  }, []);

  const [alertLoading, alert] = useFetchAlertDetail(selectedAlertId);

  return (
    <>
      {alertLoading === false && alert && selectedAlertId !== '' && (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={alert}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      )}
      {casesUi.getCaseView({
        allCasesNavigation: {
          href: allCasesHref,
          onClick: async (ev) => {
            if (ev != null) {
              ev.preventDefault();
            }
            return navigateToUrl(casesUrl);
          },
        },
        caseDetailsNavigation: {
          href: caseDetailsHref,
          onClick: async (ev) => {
            if (ev != null) {
              ev.preventDefault();
            }
            return navigateToUrl(`${casesUrl}${getCaseDetailsUrl({ id: caseId })}`);
          },
        },
        caseId,
        configureCasesNavigation: {
          href: configureCasesHref,
          onClick: async (ev) => {
            if (ev != null) {
              ev.preventDefault();
            }
            return navigateToUrl(`${casesUrl}${configureCasesLink}`);
          },
        },
        ruleDetailsNavigation: {
          href: (ruleId) => {
            return getUrlForApp('management', {
              path: `/insightsAndAlerting/triggersActions/rule/${ruleId}`,
            });
          },
          onClick: async (ruleId, ev) => {
            if (ev != null) {
              ev.preventDefault();
            }
            return navigateToApp('management', {
              path: `/insightsAndAlerting/triggersActions/rule/${ruleId}`,
            });
          },
        },
        getCaseDetailHrefWithCommentId,
        onCaseDataSuccess,
        subCaseId,
        useFetchAlertData,
        showAlertDetails: (alertId) => {
          setSelectedAlertId(alertId);
        },
        userCanCrud,
        hideSyncAlerts: true,
      })}
    </>
  );
});
