/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { omit } from 'lodash/fp';
import { createStructuredSelector } from 'reselect';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import * as i18nCommon from '../../../common/translations';
import { EmptyPage, EmptyPageActionsProps } from '../../../common/components/empty_page';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import {
  useEndpointSelector,
  useIngestUrl,
} from '../../../management/pages/endpoint_hosts/view/hooks';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useIngestEnabledCheck } from '../../../common/hooks/endpoint/ingest_enabled';
import { CreateStructuredSelector } from '../../../common/store';
import { endpointPackageVersion as useEndpointPackageVersion } from '../../../management/pages/endpoint_hosts/store/selectors';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();
  const selector = (createStructuredSelector as CreateStructuredSelector)({
    endpointPackageVersion: useEndpointPackageVersion,
  });
  const { endpointPackageVersion } = useEndpointSelector(selector);
  const { url: ingestUrl } = useIngestUrl('');

  const endpointIntegrationUrlPath = endpointPackageVersion
    ? `/endpoint-${endpointPackageVersion}/add-integration`
    : '';
  const endpointIntegrationUrl = `#/integrations${endpointIntegrationUrlPath}`;
  const handleEndpointClick = useNavigateToAppEventHandler('fleet', {
    path: endpointIntegrationUrl,
  });
  const { allEnabled: isIngestEnabled } = useIngestEnabledCheck();

  const emptyPageActions: EmptyPageActionsProps = useMemo(
    () => ({
      elasticAgent: {
        label: i18nCommon.EMPTY_ACTION_ELASTIC_AGENT,
        url: ingestUrl,
        description: i18nCommon.EMPTY_ACTION_ELASTIC_AGENT_DESCRIPTION,
        fill: false,
      },
      beats: {
        label: i18nCommon.EMPTY_ACTION_BEATS,
        url: `${basePath}${ADD_DATA_PATH}`,
        description: i18nCommon.EMPTY_ACTION_BEATS_DESCRIPTION,
        fill: false,
      },
      endpoint: {
        label: i18nCommon.EMPTY_ACTION_ENDPOINT,
        url: endpointIntegrationUrl,
        description: i18nCommon.EMPTY_ACTION_ENDPOINT_DESCRIPTION,
        onClick: handleEndpointClick,
        fill: false,
      },
    }),
    [basePath, ingestUrl, endpointIntegrationUrl, handleEndpointClick]
  );

  const emptyPageIngestDisabledActions = useMemo(
    () => omit(['elasticAgent', 'endpoint'], emptyPageActions),
    [emptyPageActions]
  );

  return isIngestEnabled === true ? (
    <EmptyPage
      actions={emptyPageActions}
      data-test-subj="empty-page"
      message={
        <>
          <FormattedMessage
            id="xpack.securitySolution.emptyMessage"
            defaultMessage="Elastic Security integrates the free and open Elastic SIEM with Endpoint Security to prevent, detect, and respond to threats. To begin, you’ll need to add security solution related data to the Elastic Stack. For additional information, you can view our "
          />
          <EuiLink href={docLinks.links.siem.gettingStarted} target="_blank">
            {i18nCommon.EMPTY_ACTION_SECONDARY}
          </EuiLink>
        </>
      }
      title={i18nCommon.EMPTY_TITLE}
    />
  ) : (
    <EmptyPage
      actions={emptyPageIngestDisabledActions}
      data-test-subj="empty-page"
      message={
        <>
          <FormattedMessage
            id="xpack.securitySolution.emptyMessage"
            defaultMessage="Elastic Security integrates the free and open Elastic SIEM with Endpoint Security to prevent, detect, and respond to threats. To begin, you’ll need to add security solution related data to the Elastic Stack. For additional information, you can view our "
          />
          <EuiLink href={docLinks.links.siem.gettingStarted} target="_blank">
            {i18nCommon.EMPTY_ACTION_SECONDARY}
          </EuiLink>
        </>
      }
      title={i18nCommon.EMPTY_TITLE}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
