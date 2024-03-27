/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../../common/locators/paths';
import { formatRemoteKibanaUrl, openRemoteKibana } from '../../../utils/slo/utils';
import { useKibana } from '../../../utils/kibana_react';

export const useSloActions = (slo?: SLOWithSummaryResponse) => {
  const {
    share: {
      url: { locators },
    },
    http,
  } = useKibana().services;

  const handleNavigateToRules = async () => {
    const locator = locators.get<RulesParams>(rulesLocatorID);

    if (slo?.kibanaUrl) {
      const basePath = http.basePath.get();
      const url = await locator?.getUrl({ params: { sloId: slo.id } });
      // since basePath is already included in the kibanaUrl, we need to remove it from the start of url
      const urlWithoutBasePath = url?.replace(basePath, '');
      openRemoteKibana(slo.kibanaUrl, urlWithoutBasePath);
    } else {
      if (slo?.id && locator) {
        locator.navigate({ params: { sloId: slo.id } }, { replace: false });
      }
    }
  };

  const detailsUrl = slo
    ? paths.sloDetails(
        slo.id,
        ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined,
        slo.remoteName
      )
    : '';

  const remoteDeleteUrl = formatRemoteKibanaUrl(slo?.kibanaUrl ?? '', detailsUrl) + `&delete=true`;

  const editSloHref = () => {
    if (slo) {
      if (slo.kibanaUrl) {
        return formatRemoteKibanaUrl(slo.kibanaUrl, paths.sloEdit(slo.id));
      } else {
        return http.basePath.prepend(paths.sloEdit(slo.id));
      }
    }
  };

  return {
    editSloHref,
    handleNavigateToRules,
    remoteDeleteUrl,
    sloDetailsUrl: http.basePath.prepend(detailsUrl),
  };
};
