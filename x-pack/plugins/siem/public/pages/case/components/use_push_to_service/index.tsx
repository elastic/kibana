/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';

import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import { Case } from '../../../../containers/case/types';
import { useGetActionLicense } from '../../../../containers/case/use_get_action_license';
import { usePostPushToService } from '../../../../containers/case/use_post_push_to_service';
import { getConfigureCasesUrl } from '../../../../components/link_to';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import { navTabs } from '../../../home/home_navigations';
import { CaseCallOut } from '../callout';
import { getLicenseError, getKibanaConfigError } from './helpers';
import * as i18n from './translations';

export interface UsePushToService {
  caseId: string;
  caseStatus: string;
  isNew: boolean;
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
}

export interface ReturnUsePushToService {
  pushButton: JSX.Element;
  pushCallouts: JSX.Element | null;
}

export const usePushToService = ({
  caseId,
  caseStatus,
  isNew,
  updateCase,
  userCanCrud,
}: UsePushToService): ReturnUsePushToService => {
  const urlSearch = useGetUrlSearch(navTabs.case);

  const { isLoading, postPushToService } = usePostPushToService();

  const { connectorId, connectorName, loading: loadingCaseConfigure } = useCaseConfigure();

  const { isLoading: loadingLicense, actionLicense } = useGetActionLicense();

  const handlePushToService = useCallback(() => {
    if (connectorId != null) {
      postPushToService({
        caseId,
        connectorId,
        connectorName,
        updateCase,
      });
    }
  }, [caseId, connectorId, connectorName, postPushToService, updateCase]);

  const errorsMsg = useMemo(() => {
    let errors: Array<{ title: string; description: JSX.Element }> = [];
    if (actionLicense != null && !actionLicense.enabledInLicense) {
      errors = [...errors, getLicenseError()];
    }
    if (connectorId === 'none' && !loadingCaseConfigure && !loadingLicense) {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="To open and update cases in external systems, you must configure a {link}."
              id="xpack.siem.case.caseView.pushToServiceDisableByNoCaseConfigDescription"
              values={{
                link: (
                  <EuiLink href={getConfigureCasesUrl(urlSearch)} target="_blank">
                    {i18n.LINK_CONNECTOR_CONFIGURE}
                  </EuiLink>
                ),
              }}
            />
          ),
        },
      ];
    }
    if (caseStatus === 'closed') {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="Closed cases cannot be sent to external systems. Reopen the case if you want to open or update it in an external system."
              id="xpack.siem.case.caseView.pushToServiceDisableBecauseCaseClosedDescription"
            />
          ),
        },
      ];
    }
    if (actionLicense != null && !actionLicense.enabledInConfig) {
      errors = [...errors, getKibanaConfigError()];
    }
    return errors;
  }, [actionLicense, caseStatus, connectorId, loadingCaseConfigure, loadingLicense, urlSearch]);

  const pushToServiceButton = useMemo(
    () => (
      <EuiButton
        data-test-subj="push-to-service-now"
        fill
        iconType="importAction"
        onClick={handlePushToService}
        disabled={
          isLoading ||
          loadingLicense ||
          loadingCaseConfigure ||
          errorsMsg.length > 0 ||
          !userCanCrud
        }
        isLoading={isLoading}
      >
        {isNew ? i18n.PUSH_SERVICENOW : i18n.UPDATE_PUSH_SERVICENOW}
      </EuiButton>
    ),
    [
      isNew,
      handlePushToService,
      isLoading,
      loadingLicense,
      loadingCaseConfigure,
      errorsMsg,
      userCanCrud,
    ]
  );

  const objToReturn = useMemo(
    () => ({
      pushButton:
        errorsMsg.length > 0 ? (
          <EuiToolTip
            position="top"
            title={errorsMsg[0].title}
            content={<p>{errorsMsg[0].description}</p>}
          >
            {pushToServiceButton}
          </EuiToolTip>
        ) : (
          <>{pushToServiceButton}</>
        ),
      pushCallouts:
        errorsMsg.length > 0 ? (
          <CaseCallOut title={i18n.ERROR_PUSH_SERVICE_CALLOUT_TITLE} messages={errorsMsg} />
        ) : null,
    }),
    [errorsMsg, pushToServiceButton]
  );
  return objToReturn;
};
