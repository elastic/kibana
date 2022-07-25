/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';

import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { isModifiedEvent, isLeftClickEvent, useKibana } from '../common/lib/kibana';
import { OsqueryIcon } from './osquery_icon';
import { useBreadcrumbs } from '../common/hooks/use_breadcrumbs';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

const OsqueryAppEmptyStateComponent = () => {
  useBreadcrumbs('base');

  const {
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;

  const integrationHref = useMemo(
    () =>
      getUrlForApp(INTEGRATIONS_PLUGIN_ID, {
        path: pagePathGetters.integration_details_overview({
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
          path: pagePathGetters.integration_details_overview({
            pkgkey: OSQUERY_INTEGRATION_NAME,
          })[1],
        });
      }
    },
    [navigateToApp]
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

  return <KibanaPageTemplate isEmptyState={true} pageHeader={pageHeader} />;
};

export const OsqueryAppEmptyState = React.memo(OsqueryAppEmptyStateComponent);
