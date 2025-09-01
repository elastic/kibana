/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from, where } from '@kbn/esql-composer';
import { ERROR_GROUP_ID, SERVICE_NAME } from '@kbn/apm-types';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export const getESQLQuery = ({
  params,
  apmIndexSettings,
}: {
  params: {
    serviceName?: string;
    kuery?: string;
    errorGroupId?: string;
  };
  apmIndexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  if (!apmIndexSettings || apmIndexSettings?.length === 0) {
    return null;
  }

  const { serviceName, kuery, errorGroupId } = params;

  const errorIndices = apmIndexSettings
    .filter((indexSetting) => ['error'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(errorIndices)).join(',');

  const filters = [];

  if (errorGroupId) {
    filters.push(where(`${ERROR_GROUP_ID} == ?errorGroupId`, { errorGroupId }));
  }

  if (serviceName) {
    filters.push(where(`${SERVICE_NAME} == ?serviceName`, { serviceName }));
  }

  if (kuery) {
    filters.push(where(`KQL("${kuery.replaceAll('"', '\\"')}")`));
  }

  return from(dedupedIndices)
    .pipe(...filters)
    .toString();
};

export function OpenErrorInDiscoverButton({ dataTestSubj }: { dataTestSubj: string }) {
  const { share } = useApmPluginContext();
  const { serviceName } = useApmServiceContext();
  const { services } = useKibana<ApmPluginStartDeps>();

  const {
    query: { rangeFrom, rangeTo, kuery },
    path: { groupId },
  } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );

  const { data = { apmIndexSettings: [] } } = useFetcher(
    (_, signal) => services.apmSourcesAccess.getApmIndexSettings({ signal }),
    [services.apmSourcesAccess]
  );

  const params = {
    kuery,
    errorGroupId: groupId,
    serviceName,
  };

  const esqlQuery = getESQLQuery({
    params,
    apmIndexSettings: data.apmIndexSettings,
  });

  if (!esqlQuery) {
    return null;
  }

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: esqlQuery,
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.apm.openErrorInDiscoverButton.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
    >
      {i18n.translate('xpack.apm.openErrorInDiscoverButton.label', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiButtonEmpty>
  );
}
