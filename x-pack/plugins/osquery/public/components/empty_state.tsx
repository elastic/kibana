/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { Redirect } from 'react-router-dom';

import { KibanaPageTemplate } from '../../../../../src/plugins/kibana_react/public';
import { INTEGRATIONS_PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { isModifiedEvent, isLeftClickEvent, useKibana } from '../common/lib/kibana';
import { useOsqueryIntegrationStatus } from '../common/hooks';
import { OsqueryIcon } from './osquery_icon';

const OsqueryAppEmptyStateComponent = () => {
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

  const pageHeader = useMemo(
    () => ({
      iconType: OsqueryIcon,
      pageTitle: (
        <FormattedMessage
          id="xpack.osquery.emptyState.pageTitle"
          defaultMessage="Add Osquery Manager"
        />
      ),
      description: (
        <FormattedMessage
          id="xpack.osquery.emptyState.pageDescription"
          defaultMessage="Add this integration to run and schedule queries for Elastic Agent."
        />
      ),
      rightSideItems: [
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiButton
          key="button"
          fill
          href={integrationHref}
          onClick={integrationClick}
          iconType="plusInCircleFilled"
        >
          <FormattedMessage
            id="xpack.osquery.emptyState.addOsqueryManagerButton"
            defaultMessage="Add Osquery Manager"
          />
        </EuiButton>,
      ],
    }),
    [integrationClick, integrationHref]
  );

  return (
    <>
      <KibanaPageTemplate isEmptyState={true} pageHeader={pageHeader} />
      <Redirect to="/" />
    </>
  );
};

export const OsqueryAppEmptyState = React.memo(OsqueryAppEmptyStateComponent);
