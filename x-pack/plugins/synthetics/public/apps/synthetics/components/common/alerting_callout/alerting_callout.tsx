/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { syntheticsSettingsLocatorID } from '@kbn/observability-plugin/common';
import { selectOverviewState } from '../../../state';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { useAlertingDefaults } from '../../settings/alerting_defaults/hooks/use_alerting_defaults';
import { useSyntheticsStartPlugins } from '../../../contexts';

export const AlertingCallout = ({ isAlertingEnabled }: { isAlertingEnabled?: boolean }) => {
  const dispatch = useDispatch();
  const [url, setUrl] = useState<string | undefined>('');

  const { connectors, loading } = useAlertingDefaults();

  const {
    data: { monitors },
  } = useSelector(selectOverviewState);

  const syntheticsLocators = useSyntheticsStartPlugins()?.share?.url.locators;
  const locator = syntheticsLocators?.get(syntheticsSettingsLocatorID);

  useEffect(() => {
    async function generateUrl() {
      const settingsUrl = await locator?.getUrl({});
      setUrl(settingsUrl);
    }
    generateUrl();
  }, [locator]);

  const hasDefaultConnector = !loading && connectors?.length;
  const hasAlertingConfigured =
    isAlertingEnabled ?? monitors.some((monitor) => monitor.isStatusAlertEnabled);

  const showCallout = url && !hasDefaultConnector && hasAlertingConfigured;

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  return showCallout ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.alerting.noConnectorsCallout.header"
            defaultMessage="Alerts are not being sent"
          />
        }
        color="warning"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.synthetics.alerting.noConnectorsCallout.content"
            defaultMessage="You have monitors with alerting enabled, but there is no default connector configured to send those alerts. Configure your default connector {here}."
            values={{
              here: (
                <EuiLink data-test-subj="syntheticsAlertingCalloutHeresALinkLink" href={url}>
                  <FormattedMessage
                    id="xpack.synthetics.alerting.noConnectorsCallout.here.label"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};
