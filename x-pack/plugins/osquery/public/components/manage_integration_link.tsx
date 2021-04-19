/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

import { pagePathGetters } from '../../../fleet/public';

import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { useOsqueryIntegration } from '../common/hooks';

const ManageIntegrationLinkComponent = () => {
  const {
    application: {
      getUrlForApp,
      navigateToApp,
      capabilities: {
        osquery: { save: hasSaveUICapabilities },
      },
    },
  } = useKibana().services;
  const { data: osqueryIntegration } = useOsqueryIntegration();

  const integrationHref = useMemo(() => {
    if (osqueryIntegration) {
      return getUrlForApp('fleet', {
        path:
          '#' +
          pagePathGetters.integration_details_policies({
            pkgkey: `${osqueryIntegration.name}-${osqueryIntegration.version}`,
          }),
      });
    }
  }, [getUrlForApp, osqueryIntegration]);

  const integrationClick = useCallback(
    (event) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        if (osqueryIntegration) {
          return navigateToApp('fleet', {
            path:
              '#' +
              pagePathGetters.integration_details_policies({
                pkgkey: `${osqueryIntegration.name}-${osqueryIntegration.version}`,
              }),
          });
        }
      }
    },
    [navigateToApp, osqueryIntegration]
  );

  return hasSaveUICapabilities && integrationHref ? (
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
