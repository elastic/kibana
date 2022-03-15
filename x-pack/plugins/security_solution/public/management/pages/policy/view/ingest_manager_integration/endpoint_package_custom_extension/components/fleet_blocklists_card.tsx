/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { getBlocklistsListPath } from '../../../../../../common/routing';
import { ListPageRouteState } from '../../../../../../../../common/endpoint/types';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { useKibana, useToasts } from '../../../../../../../common/lib/kibana';
import { useAppUrl } from '../../../../../../../common/lib/kibana/hooks';
import { LinkWithIcon } from './link_with_icon';
import { ExceptionItemsSummary } from './exception_items_summary';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';
import { BlocklistsApiClient } from '../../../../../blocklist/services';
import { useSummaryArtifact } from '../../../../../../hooks/artifacts';

export const FleetBlocklistsCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const { getAppUrl } = useAppUrl();
  const {
    services: { http },
  } = useKibana();
  const toasts = useToasts();
  const blocklistsListUrlPath = getBlocklistsListPath();
  const blocklistsApiClientInstance = BlocklistsApiClient.getInstance(http);

  const { data } = useSummaryArtifact(blocklistsApiClientInstance, {}, [], {
    onError: (error) =>
      toasts.addDanger(
        i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsSummaryError',
          {
            defaultMessage: 'There was an error trying to fetch blocklists stats: "{error}"',
            values: { error: error.message },
          }
        )
      ),
  });

  const blocklistsRouteState = useMemo<ListPageRouteState>(() => {
    const fleetPackageCustomUrlPath = `#${
      pagePathGetters.integration_details_custom({ pkgkey })[1]
    }`;
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.fleetCustomExtension.backButtonLabel',
        { defaultMessage: 'Return to Endpoint Security integrations' }
      ),
      onBackButtonNavigateTo: [
        INTEGRATIONS_PLUGIN_ID,
        {
          path: fleetPackageCustomUrlPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: INTEGRATIONS_PLUGIN_ID,
        path: fleetPackageCustomUrlPath,
      }),
    };
  }, [getAppUrl, pkgkey]);

  return (
    <EuiPanel hasShadow={false} paddingSize="l" hasBorder data-test-subj="fleedBlocklistsCard">
      <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center">
        <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsLabel"
                defaultMessage="Blocklists"
              />
            </h4>
          </EuiText>
        </StyledEuiFlexGridItem>
        <StyledEuiFlexGridItem gridarea="summary">
          <ExceptionItemsSummary stats={data} />
        </StyledEuiFlexGridItem>
        <StyledEuiFlexGridItem gridarea="link" alignitems="flex-end">
          <>
            <LinkWithIcon
              href={getAppUrl({
                path: blocklistsListUrlPath,
              })}
              appPath={blocklistsListUrlPath}
              appState={blocklistsRouteState}
              data-test-subj="linkBlocklists"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.manageBlocklistsLinkLabel"
                defaultMessage="Manage"
              />
            </LinkWithIcon>
          </>
        </StyledEuiFlexGridItem>
      </StyledEuiFlexGridGroup>
    </EuiPanel>
  );
});

FleetBlocklistsCard.displayName = 'FleetBlocklistsCard';
