import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { HOST_FIELD } from '../../../../../common/constants';
import { useKibanaEnvironmentContext } from '../../../../hooks/use_kibana';
import { Section } from '../../components/section';
import { APM_HOST_FILTER_FIELD } from '../../constants';
import { useServices } from '../../hooks/use_services';
import { LinkToApmServices } from '../../links';
import { LinkToApmService } from '../../links/link_to_apm_service';
import { ServicesSectionTitle } from './section_titles';

export const ServicesContent = ({
  hostName,
  dateRange,
}: {
  hostName: string;
  dateRange: TimeRange;
}) => {
  const { isServerlessEnv } = useKibanaEnvironmentContext();
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
      filters: { [HOST_FIELD]: hostName },
      from: dateRange.from,
      to: dateRange.to,
    }),
    [hostName, dateRange.from, dateRange.to]
  );
  const { error, loading, response } = useServices(params);
  const services = response?.services;
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
      ) : loading ? (
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
