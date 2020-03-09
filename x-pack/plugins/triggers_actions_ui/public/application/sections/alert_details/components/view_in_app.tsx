/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
import { useAppDependencies } from '../../../app_context';

import {
  AlertNavigation,
  AlertStateNavigation,
  AlertUrlNavigation,
} from '../../../../../../alerting/common';
import { Alert } from '../../../../types';

interface ViewInAppProps {
  alert: Alert;
}

const NO_NAVIGATION = 'NO_NAVIGATION';

type AlertNavigationLoadingState = AlertNavigation | 'NO_NAVIGATION' | null;

export const ViewInApp: React.FunctionComponent<ViewInAppProps> = ({ alert }) => {
  const { navigateToApp, alerting } = useAppDependencies();

  const [alertNavigation, setAlertNavigation] = useState<AlertNavigationLoadingState>(null);
  useEffect(() => {
    alerting
      .getNavigation(alert.id)
      .then(nav => (nav ? setAlertNavigation(nav) : setAlertNavigation(NO_NAVIGATION)))
      .catch(() => {
        setAlertNavigation(NO_NAVIGATION);
      });
  }, [alert.id, alerting]);

  return (
    <EuiButtonEmpty
      isLoading={alertNavigation === null}
      disabled={!hasNavigation(alertNavigation)}
      iconType="popout"
      {...getNavigationHandler(alertNavigation, alert, navigateToApp)}
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertDetails.viewAlertInAppButtonLabel"
        defaultMessage="View in app"
      />
    </EuiButtonEmpty>
  );
};

function hasNavigation(alertNavigation: AlertNavigationLoadingState) {
  return hasNavigationState(alertNavigation) || hasNavigationUrl(alertNavigation);
}

function hasNavigationState(
  alertNavigation: AlertNavigationLoadingState
): alertNavigation is AlertStateNavigation {
  return alertNavigation ? alertNavigation.hasOwnProperty('state') : false;
}

function hasNavigationUrl(
  alertNavigation: AlertNavigationLoadingState
): alertNavigation is AlertUrlNavigation {
  return alertNavigation ? alertNavigation.hasOwnProperty('url') : false;
}

function getNavigationHandler(
  alertNavigation: AlertNavigationLoadingState,
  alert: Alert,
  navigateToApp: CoreStart['application']['navigateToApp']
): object {
  if (hasNavigationState(alertNavigation)) {
    return {
      onClick: () => {
        navigateToApp(alert.consumer, { state: alertNavigation.state });
      },
    };
  }
  if (hasNavigationUrl(alertNavigation)) {
    return { href: alertNavigation.url };
  }
  return {};
}
