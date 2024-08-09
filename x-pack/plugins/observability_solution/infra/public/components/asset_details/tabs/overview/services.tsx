/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { ServicesAPIResponseRT } from '../../../../../common/http_api';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { Section } from '../../components/section';
import { ServicesSectionTitle } from './section_titles';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { LinkToApmServices } from '../../links';
import { APM_HOST_FILTER_FIELD } from '../../constants';
import { LinkToApmService } from '../../links/link_to_apm_service';
import { useKibanaEnvironmentContext } from '../../../../hooks/use_kibana';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

export const ServicesContent = ({
  hostName,
  dateRange,
}: {
  hostName: string;
  dateRange: TimeRange;
}) => {
  const { isServerlessEnv } = useKibanaEnvironmentContext();
  const { request$ } = useRequestObservable();
  const { isActiveTab } = useTabSwitcherContext();

  const linkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial/apm',
  });
  const serverlessLinkProps = useLinkProps({
    app: 'apm',
    pathname: '/onboarding',
  });
  const params = useMemo(
    () => ({
      filters: { [HOST_NAME_FIELD]: hostName },
      from: dateRange.from,
      to: dateRange.to,
    }),
    [hostName, dateRange.from, dateRange.to]
  );

  const query = useMemo(() => ({ ...params, filters: JSON.stringify(params.filters) }), [params]);

  const { data, status, error } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/infra/services', {
        method: 'GET',
        query,
      });

      return decodeOrThrow(ServicesAPIResponseRT)(response);
    },
    [query],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('overview'),
    }
  );

  const services = data?.services;
  const hasServices = services?.length;

  return (
    <Section
      title={<ServicesSectionTitle />}
      collapsible
      data-test-subj="infraAssetDetailsServicesCollapsible"
      id="services"
      extraAction={<LinkToApmServices assetId={hostName} apmField={APM_HOST_FILTER_FIELD} />}
    >
      {error ? (
        <EuiCallOut
          title={i18n.translate('xpack.infra.assetDetails.services.getServicesRequestErrorTitle', {
            defaultMessage: 'Error',
          })}
          color="danger"
          iconType="alert"
        >
          {i18n.translate('xpack.infra.assetDetails.services.getServicesRequestError', {
            defaultMessage: 'An error occurred while fetching services.',
          })}
        </EuiCallOut>
      ) : isPending(status) ? (
        <EuiLoadingSpinner size="m" />
      ) : hasServices ? (
        <EuiFlexGroup
          wrap
          responsive={false}
          gutterSize="xs"
          data-test-subj="infraAssetDetailsServicesContainer"
        >
          {services.map((service, index) => (
            <EuiFlexItem grow={false} key={index}>
              <LinkToApmService
                serviceName={service.serviceName}
                agentName={service.agentName}
                dateRange={dateRange}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.services.noServicesMsg"
            defaultMessage="No services found on this host. Click {apmTutorialLink} to instrument your services with APM."
            values={{
              apmTutorialLink: (
                <EuiLink
                  data-test-subj="assetDetailsTooltiAPMTutorialLink"
                  href={isServerlessEnv ? serverlessLinkProps.href : linkProps.href}
                >
                  <FormattedMessage
                    id="xpack.infra.assetDetails.table.services.noServices.tutorialLink"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      )}
    </Section>
  );
};
