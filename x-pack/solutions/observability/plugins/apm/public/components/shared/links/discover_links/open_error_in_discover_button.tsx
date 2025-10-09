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

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from } from '@kbn/esql-composer';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { BaseDiscoverButton } from './base_discover_button';
import { filterByErrorGroupId, filterByKuery, filterByServiceName } from './filters';

export const getESQLQuery = ({
  params,
  indexSettings,
}: {
  params: {
    serviceName?: string;
    kuery?: string;
    errorGroupId?: string;
  };
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  if (!indexSettings || indexSettings?.length === 0) {
    return null;
  }

  const { serviceName, kuery, errorGroupId } = params;

  const errorIndices = indexSettings
    .filter((indexSetting) => ['error'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(errorIndices)).join(',');

  const filters = [];

  if (errorGroupId) {
    filters.push(filterByErrorGroupId(errorGroupId));
  }

  if (serviceName) {
    filters.push(filterByServiceName(serviceName));
  }

  if (kuery) {
    filters.push(filterByKuery(kuery));
  }

  return from(dedupedIndices)
    .pipe(...filters)
    .toString();
};

export function OpenErrorInDiscoverButton({ dataTestSubj }: { dataTestSubj: string }) {
  const { serviceName, indexSettings } = useApmServiceContext();

  const {
    query: { rangeFrom, rangeTo, kuery },
    path: { groupId },
  } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );

  const params = {
    kuery,
    errorGroupId: groupId,
    serviceName,
  };

  const esqlQuery = getESQLQuery({
    params,
    indexSettings,
  });

  return (
    <BaseDiscoverButton
      dataTestSubj={dataTestSubj}
      esqlQuery={esqlQuery}
      rangeTo={rangeTo}
      rangeFrom={rangeFrom}
      label={i18n.translate('xpack.apm.openErrorInDiscoverButton.label', {
        defaultMessage: 'Open in Discover',
      })}
      ariaLabel={i18n.translate('xpack.apm.openErrorInDiscoverButton.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
    />
  );
}
