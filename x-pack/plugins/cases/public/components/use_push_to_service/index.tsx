/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';

import { useGetActionLicense } from '../../containers/use_get_action_license';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { CaseCallOut } from './callout';
import { getLicenseError, getKibanaConfigError } from './helpers';
import * as i18n from './translations';
import { Case, CaseConnector, ActionConnector, CaseStatuses } from '../../../common';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { CasesNavigation } from '../links';
import { CLOSED_CASE_PUSH_ERROR_ID, ErrorMessage } from './callout/types';

export interface UsePushToService {
  caseId: string;
  caseServices: CaseServices;
  caseStatus: string;
  configureCasesNavigation: CasesNavigation;
  connector: CaseConnector;
  connectors: ActionConnector[];
  hasDataToPush: boolean;
  isValidConnector: boolean;
  onEditClick: () => void;
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
}

export interface ReturnUsePushToService {
  pushButton: JSX.Element;
  pushCallouts: JSX.Element | null;
}

export const usePushToService = ({
  caseId,
  caseServices,
  caseStatus,
  configureCasesNavigation,
  connector,
  connectors,
  hasDataToPush,
  isValidConnector,
  onEditClick,
  updateCase,
  userCanCrud,
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

    // these message require that the user do some sort of write action as a result of the message, readonly users won't
    // be able to perform such an action so let's not display the error to the user in that situation
    if (!userCanCrud) {
      return errors;
    }

    const hasLicenseError = actionLicense != null && !actionLicense.enabledInLicense;

    if (hasLicenseError) {
      errors = [...errors, getLicenseError()];
    }

    if (connectors.length === 0 && connector.id === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-missing-error',
          title: '',
          description: i18n.CONFIGURE_CONNECTOR,
        },
      ];
    } else if (connector.id === 'none' && !loadingLicense) {
      errors = [
        ...errors,
        {
          id: 'connector-not-selected-error',
          title: '',
          description: i18n.CONFIGURE_CONNECTOR,
        },
      ];
    } else if (!isValidConnector && !loadingLicense && !hasLicenseError) {
      errors = [
        ...errors,
        {
          id: 'connector-deleted-error',
          title: '',
          description: (
            <FormattedMessage
              defaultMessage="The connector used to send updates to external service has been deleted or you do not have the {appropriateLicense} to use it. To update cases in external systems, select a different connector or create a new one."
              id="xpack.cases.configureCases.warningMessage"
              values={{
                appropriateLicense: (
                  <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
                    {i18n.LINK_APPROPRIATE_LICENSE}
                  </EuiLink>
                ),
              }}
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
          id: CLOSED_CASE_PUSH_ERROR_ID,
          title: '',
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
  }, [actionLicense, caseStatus, connectors.length, connector, loadingLicense, userCanCrud]);

  const pushToServiceButton = useMemo(
    () => (
      <EuiButtonEmpty
        data-test-subj="push-to-external-service"
        iconType="importAction"
        onClick={handlePushToService}
        disabled={
          isLoading ||
          loadingLicense ||
          errorsMsg.length > 0 ||
          !userCanCrud ||
          !isValidConnector ||
          !hasDataToPush
        }
        isLoading={isLoading}
      >
        {caseServices[connector.id]
          ? i18n.UPDATE_THIRD(connector.name)
          : i18n.PUSH_THIRD(connector.name)}
      </EuiButtonEmpty>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      connector,
      connectors,
      errorsMsg,
      handlePushToService,
      hasDataToPush,
      isLoading,
      loadingLicense,
      userCanCrud,
      isValidConnector,
    ]
  );

  const objToReturn = useMemo(
    () => ({
      pushButton:
        errorsMsg.length > 0 || !hasDataToPush ? (
          <EuiToolTip
            position="top"
            title={
              errorsMsg.length > 0 ? errorsMsg[0].title : i18n.PUSH_LOCKED_TITLE(connector.name)
            }
            content={
              <p>{errorsMsg.length > 0 ? errorsMsg[0].description : i18n.PUSH_LOCKED_DESC}</p>
            }
          >
            {pushToServiceButton}
          </EuiToolTip>
        ) : (
          <>{pushToServiceButton}</>
        ),
      pushCallouts:
        errorsMsg.length > 0 ? (
          <CaseCallOut
            configureCasesNavigation={configureCasesNavigation}
            hasConnectors={connectors.length > 0}
            messages={errorsMsg}
            onEditClick={onEditClick}
          />
        ) : null,
    }),
    [
      configureCasesNavigation,
      connector.name,
      connectors.length,
      errorsMsg,
      hasDataToPush,
      onEditClick,
      pushToServiceButton,
    ]
  );

  return objToReturn;
};
