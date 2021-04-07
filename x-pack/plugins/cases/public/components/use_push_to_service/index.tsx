/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';

import { Case } from '../../containers/types';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { CaseCallOut } from '../callout';
import { getLicenseError, getKibanaConfigError } from './helpers';
import * as i18n from './translations';
import { CaseConnector, ActionConnector, CaseStatuses } from '../../../common';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { CasesNavigation, LinkAnchor } from '../links';
import { ErrorMessage } from '../callout/types';

export interface UsePushToService {
  caseId: string;
  caseStatus: string;
  configureCasesNavigation: CasesNavigation;
  connector: CaseConnector;
  caseServices: CaseServices;
  connectors: ActionConnector[];
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
  isValidConnector: boolean;
}

export interface ReturnUsePushToService {
  pushButton: JSX.Element;
  pushCallouts: JSX.Element | null;
}

export const usePushToService = ({
  configureCasesNavigation: { onClick, href },
  connector,
  caseId,
  caseServices,
  caseStatus,
  connectors,
  updateCase,
  userCanCrud,
  isValidConnector,
}: UsePushToService): ReturnUsePushToService => {
  const { isLoading, pushCaseToExternalService } = usePostPushToService();

  const { isLoading: loadingLicense, actionLicense } = useGetActionLicense();

  const handlePushToService = useCallback(async () => {
    if (connector.id != null && connector.id !== 'none') {
      const theCase = await pushCaseToExternalService({
        caseId,
        connector,
      });

      if (theCase != null) {
        updateCase(theCase);
      }
    }
  }, [caseId, connector, pushCaseToExternalService, updateCase]);

  const errorsMsg = useMemo(() => {
    let errors: ErrorMessage[] = [];
    if (actionLicense != null && !actionLicense.enabledInLicense) {
      errors = [...errors, getLicenseError()];
    }
    if (connectors.length === 0 && connector.id === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-missing-error',
          title: i18n.PUSH_DISABLE_BY_NO_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="To open and update cases in external systems, you must configure a {link}."
              id="xpack.cases.caseView.pushToServiceDisableByNoConnectors"
              values={{
                link: (
                  <LinkAnchor onClick={onClick} href={href} target="_blank">
                    {i18n.LINK_CONNECTOR_CONFIGURE}
                  </LinkAnchor>
                ),
              }}
            />
          ),
        },
      ];
    } else if (connector.id === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-not-selected-error',
          title: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="To open and update cases in external systems, you must select an external incident management system for this case."
              id="xpack.cases.caseView.pushToServiceDisableByNoCaseConfigDescription"
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
              id="xpack.cases.caseView.pushToServiceDisableByInvalidConnector"
            />
          ),
          errorType: 'danger',
        },
      ];
    }
    if (caseStatus === CaseStatuses.closed) {
      errors = [
        ...errors,
        {
          id: 'closed-case-push-error',
          title: i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE,
          description: (
            <FormattedMessage
              defaultMessage="Closed cases cannot be sent to external systems. Reopen the case if you want to open or update it in an external system."
              id="xpack.cases.caseView.pushToServiceDisableBecauseCaseClosedDescription"
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
  }, [actionLicense, caseStatus, connectors.length, connector, loadingLicense]);

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
        {caseServices[connector.id]
          ? i18n.UPDATE_THIRD(connector.name)
          : i18n.PUSH_THIRD(connector.name)}
      </EuiButton>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    connector,
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
