/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
import { fromNullable, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { useAppDependencies } from '../../../app_context';

import {
  AlertNavigation,
  AlertStateNavigation,
  AlertUrlNavigation,
} from '../../../../../../alerts/common';
import { Alert } from '../../../../types';

export interface ViewInAppProps {
  alert: Alert;
}

const NO_NAVIGATION = false;

type AlertNavigationLoadingState = AlertNavigation | false | null;

export const ViewInApp: React.FunctionComponent<ViewInAppProps> = ({ alert }) => {
  const { navigateToApp, alerts: maybeAlerting } = useAppDependencies();

  const [alertNavigation, setAlertNavigation] = useState<AlertNavigationLoadingState>(null);
  useEffect(() => {
    pipe(
      fromNullable(maybeAlerting),
      fold(
        /**
         * If the alerting plugin is disabled,
         * navigation isn't supported
         */
        () => setAlertNavigation(NO_NAVIGATION),
        (alerts) => {
          return alerts
            .getNavigation(alert.id)
            .then((nav) => (nav ? setAlertNavigation(nav) : setAlertNavigation(NO_NAVIGATION)))
            .catch(() => {
              setAlertNavigation(NO_NAVIGATION);
            });
        }
      )
    );
  }, [alert.id, maybeAlerting]);

  return (
    <EuiButtonEmpty
      data-test-subj="alertDetails-viewInApp"
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

function hasNavigation(
  alertNavigation: AlertNavigationLoadingState
): alertNavigation is AlertStateNavigation | AlertUrlNavigation {
  return alertNavigation
    ? alertNavigation.hasOwnProperty('state') || alertNavigation.hasOwnProperty('path')
    : NO_NAVIGATION;
}

function getNavigationHandler(
  alertNavigation: AlertNavigationLoadingState,
  alert: Alert,
  navigateToApp: CoreStart['application']['navigateToApp']
): object {
  return hasNavigation(alertNavigation)
    ? {
        onClick: () => {
          navigateToApp(alert.consumer, alertNavigation);
        },
      }
    : {};
}
