/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

import { INTEGRATIONS_PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';

import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { useOsqueryIntegrationStatus } from '../common/hooks';

const ManageIntegrationLinkComponent = () => {
  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;
  const { data: osqueryIntegration } = useOsqueryIntegrationStatus();

  const integrationHref = useMemo(() => {
    if (osqueryIntegration) {
      return getUrlForApp(INTEGRATIONS_PLUGIN_ID, {
        path:
          '#' +
          pagePathGetters.integration_details_policies({
            pkgkey: `${osqueryIntegration.name}-${osqueryIntegration.version}`,
          })[1],
      });
    }
  }, [getUrlForApp, osqueryIntegration]);

  const integrationClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        if (osqueryIntegration) {
          return navigateToApp(INTEGRATIONS_PLUGIN_ID, {
            path:
              '#' +
              pagePathGetters.integration_details_policies({
                pkgkey: `${osqueryIntegration.name}-${osqueryIntegration.version}`,
              })[1],
          });
        }
      }
    },
    [navigateToApp, osqueryIntegration]
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
