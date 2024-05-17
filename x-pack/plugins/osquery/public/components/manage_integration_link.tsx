/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';

import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { isLeftClickEvent, isModifiedEvent, useKibana } from '../common/lib/kibana';

const ManageIntegrationLinkComponent = () => {
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;

  const integrationHref = useMemo(
    () =>
      getUrlForApp(INTEGRATIONS_PLUGIN_ID, {
        path: pagePathGetters.integration_details_policies({
          pkgkey: OSQUERY_INTEGRATION_NAME,
        })[1],
      }),
    [getUrlForApp]
  );

  const integrationClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();

        return navigateToApp(INTEGRATIONS_PLUGIN_ID, {
          path: pagePathGetters.integration_details_policies({
            pkgkey: OSQUERY_INTEGRATION_NAME,
          })[1],
        });
      }
    },
    [navigateToApp]
  );

  return integrationHref ? (
    <EuiFlexItem>
      {
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiButtonEmpty iconType="gear" href={integrationHref} onClick={integrationClick}>
          <FormattedMessage
            id="xpack.osquery.appNavigation.manageIntegrationButton"
            defaultMessage="Manage integration"
          />
        </EuiButtonEmpty>
      }
    </EuiFlexItem>
  ) : null;
};

export const ManageIntegrationLink = React.memo(ManageIntegrationLinkComponent);
