/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { Case } from '../../containers/types';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { getConfigureCasesUrl, useFormatUrl } from '../../../common/components/link_to';
import { CaseCallOut } from '../callout';
import { getLicenseError, getKibanaConfigError } from './helpers';
import * as i18n from './translations';
import { Connector } from '../../../../../case/common/api/cases';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { LinkAnchor } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';
import { ErrorMessage } from '../callout/types';

export interface UsePushToService {
  caseId: string;
  caseStatus: string;
  caseConnectorId: string;
  caseConnectorName: string;
  caseServices: CaseServices;
  connectors: Connector[];
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
  isValidConnector: boolean;
}

export interface ReturnUsePushToService {
  pushButton: JSX.Element;
  pushCallouts: JSX.Element | null;
}

export const usePushToService = ({
  caseConnectorId,
  caseConnectorName,
  caseId,
  caseServices,
  caseStatus,
  connectors,
  updateCase,
  userCanCrud,
  isValidConnector,
}: UsePushToService): ReturnUsePushToService => {
  const history = useHistory();
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);
  const { isLoading, postPushToService } = usePostPushToService();

  const { isLoading: loadingLicense, actionLicense } = useGetActionLicense();

  const handlePushToService = useCallback(() => {
    if (caseConnectorId != null && caseConnectorId !== 'none') {
      postPushToService({
        caseId,
        caseServices,
        connectorId: caseConnectorId,
        connectorName: caseConnectorName,
        updateCase,
      });
    }
  }, [caseId, caseServices, caseConnectorId, caseConnectorName, postPushToService, updateCase]);

  const goToConfigureCases = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getConfigureCasesUrl(urlSearch));
    },
    [history, urlSearch]
  );

  const errorsMsg = useMemo(() => {
    let errors: ErrorMessage[] = [];
    if (actionLicense != null && !actionLicense.enabledInLicense) {
      errors = [...errors, getLicenseError()];
    }
    if (connectors.length === 0 && caseConnectorId === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-missing-error',
          title: i18n.PUSH_DISABLE_BY_NO_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="To open and update cases in external systems, you must configure a {link}."
              id="xpack.securitySolution.case.caseView.pushToServiceDisableByNoConnectors"
              values={{
                link: (
                  <LinkAnchor
                    onClick={goToConfigureCases}
                    href={formatUrl(getConfigureCasesUrl())}
                    target="_blank"
                  >
                    {i18n.LINK_CONNECTOR_CONFIGURE}
                  </LinkAnchor>
                ),
              }}
            />
          ),
        },
      ];
    } else if (caseConnectorId === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-not-selected-error',
          title: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="To open and update cases in external systems, you must select an external incident management system for this case."
              id="xpack.securitySolution.case.caseView.pushToServiceDisableByNoCaseConfigDescription"
            />
          ),
        },
      ];
    } else if (!isValidConnector && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-deleted-error',
          title: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="The connector used to send updates to external service has been deleted. To update cases in external systems, select a different connector or create a new one."
              id="xpack.securitySolution.case.caseView.pushToServiceDisableByInvalidConnector"
            />
          ),
          errorType: 'danger',
        },
      ];
    }
    if (caseStatus === 'closed') {
      errors = [
        ...errors,
        {
          id: 'closed-case-push-error',
          title: i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="Closed cases cannot be sent to external systems. Reopen the case if you want to open or update it in an external system."
              id="xpack.securitySolution.case.caseView.pushToServiceDisableBecauseCaseClosedDescription"
            />
          ),
        },
      ];
    }
    if (actionLicense != null && !actionLicense.enabledInConfig) {
      errors = [...errors, getKibanaConfigError()];
    }
    return errors;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionLicense, caseStatus, connectors.length, caseConnectorId, loadingLicense, urlSearch]);

  const pushToServiceButton = useMemo(() => {
    return (
      <EuiButton
        data-test-subj="push-to-external-service"
        fill
        iconType="importAction"
        onClick={handlePushToService}
        disabled={
          isLoading || loadingLicense || errorsMsg.length > 0 || !userCanCrud || !isValidConnector
        }
        isLoading={isLoading}
      >
        {caseServices[caseConnectorId]
          ? i18n.UPDATE_THIRD(caseConnectorName)
          : i18n.PUSH_THIRD(caseConnectorName)}
      </EuiButton>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    caseConnectorId,
    caseConnectorName,
    connectors,
    errorsMsg,
    handlePushToService,
    isLoading,
    loadingLicense,
    userCanCrud,
    isValidConnector,
  ]);

  const objToReturn = useMemo(() => {
    return {
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
    };
  }, [errorsMsg, pushToServiceButton]);

  return objToReturn;
};
