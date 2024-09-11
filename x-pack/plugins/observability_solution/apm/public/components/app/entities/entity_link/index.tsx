/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiEmptyPrompt, EuiLink, EuiLoadingSpinner, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { dashboardsDark, dashboardsLight } from '@kbn/shared-svg';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ENVIRONMENT_ALL_VALUE } from '../../../../../common/environment_filter_values';
import { useServiceEntitySummaryFetcher } from '../../../../context/apm_service/use_service_entity_summary_fetcher';
import { useEntityManagerEnablementContext } from '../../../../context/entity_manager_context/use_entity_manager_enablement_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useTheme } from '../../../../hooks/use_theme';
import { ApmPluginStartDeps } from '../../../../plugin';

const pageHeader = {
  pageTitle: 'APM',
};

export function EntityLink() {
  const router = useApmRouter({ prependBasePath: false });
  const theme = useTheme();
  const { services } = useKibana<ApmPluginStartDeps>();
  const { observabilityShared, data } = services;
  const timeRange = data.query.timefilter.timefilter.getTime();
  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;
  const {
    path: { serviceName },
    query: { rangeFrom = timeRange.from, rangeTo = timeRange.to },
  } = useApmParams('/link-to/entity/{serviceName}');
  const { isEntityCentricExperienceViewEnabled, entityManagerEnablementStatus } =
    useEntityManagerEnablementContext();
  const { serviceEntitySummary, serviceEntitySummaryStatus } = useServiceEntitySummaryFetcher({
    serviceName,
    environment: ENVIRONMENT_ALL_VALUE,
  });

  const { data: hasApmData, status: hasApmDataStatus } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/has_data');
  }, []);

  if (
    isPending(entityManagerEnablementStatus) ||
    serviceEntitySummaryStatus === FETCH_STATUS.LOADING ||
    isPending(hasApmDataStatus)
  ) {
    return (
      <div>
        <EuiLoadingSpinner />
      </div>
    );
  }

  if (
    // When EEM is disabled we'll show the APM overview page.
    isEntityCentricExperienceViewEnabled === false ||
    // When EEM is enabled and the Service has APM and/or Logs data, we'll show the APM overview page
    (serviceEntitySummary?.dataStreamTypes && serviceEntitySummary.dataStreamTypes.length > 0) ||
    // When EEM is enabled and the service is not found on the EEM indices but it has APM data
    hasApmData?.hasData === true
  ) {
    return (
      <Redirect
        to={router.link('/services/{serviceName}/overview', {
          path: { serviceName },
          query: {
            rangeFrom,
            rangeTo,
            kuery: '',
            serviceGroup: '',
            comparisonEnabled: true,
            environment: ENVIRONMENT_ALL_VALUE,
          },
        })}
      />
    );
  }

  // When EEM is enabled and the service is not found on the EEM indices display a callout guiding on the limitations of EEM
  return (
    <ObservabilityPageTemplate pageHeader={pageHeader}>
      <EuiEmptyPrompt
        icon={
          <EuiImage
            size="fullWidth"
            src={theme.darkMode ? dashboardsDark : dashboardsLight}
            alt=""
          />
        }
        title={
          <h2>
            {i18n.translate('xpack.apm.entityLink.eemGuide.title', {
              defaultMessage: 'Service not supported',
            })}
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.apm.entityLink.eemGuide.description"
              defaultMessage="Sorry, we aren't able to provide you with more details on this service yet due to {limitationsLink}."
              values={{
                limitationsLink: (
                  <EuiLink
                    target="_blank"
                    data-test-subj="apmEntityLinkLimitationsWithTheElasticEntityModelLink"
                    href="https://ela.st/eem-limitations"
                  >
                    {i18n.translate('xpack.apm.entityLink.eemGuide.description.link', {
                      defaultMessage: 'limitations with the Elastic Entity Model',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
        actions={[
          <EuiButtonEmpty
            data-test-subj="apmEntityLinkGoBackButton"
            iconType="arrowLeft"
            onClick={() => {
              window.history.back();
            }}
          >
            {i18n.translate('xpack.apm.entityLink.eemGuide.goBackButtonLabel', {
              defaultMessage: 'Go back',
            })}
          </EuiButtonEmpty>,
        ]}
      />
    </ObservabilityPageTemplate>
  );
}
