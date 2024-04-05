/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { paths } from '../../../../common/locators/paths';
import { useSpace } from '../../../hooks/use_space';
import { BurnRateRuleParams } from '../../../typings';
import { useKibana } from '../../../utils/kibana_react';
import {
  createRemoteSloDeleteUrl,
  createRemoteSloEditUrl,
} from '../../../utils/slo/remote_slo_urls';
import { openRemoteKibana } from '../../../utils/slo/utils';

// TODO Kevin: Refactor: can we remove the undefined check somehow?
// TODO Kevin: Refactor remote url generation
export const useSloActions = ({
  slo,
  rules,
  setIsEditRuleFlyoutOpen,
  setIsActionsPopoverOpen,
}: {
  slo?: SLOWithSummaryResponse;
  rules?: Array<Rule<BurnRateRuleParams>>;
  setIsEditRuleFlyoutOpen: (val: boolean) => void;
  setIsActionsPopoverOpen: (val: boolean) => void;
}) => {
  const {
    share: {
      url: { locators },
    },
    http,
  } = useKibana().services;
  const spaceId = useSpace();

  if (!slo) {
    return {
      sloEditUrl: '',
      handleNavigateToRules: () => {},
      remoteDeleteUrl: undefined,
      sloDetailsUrl: '',
    };
  }

  const handleNavigateToRules = async () => {
    if (rules?.length === 1) {
      // if there is only one rule we can edit inline in flyout
      setIsEditRuleFlyoutOpen(true);
      setIsActionsPopoverOpen(false);
    } else {
      const locator = locators.get<RulesParams>(rulesLocatorID);

      if (slo.remote && slo.remote.kibanaUrl !== '') {
        const basePath = http.basePath.get();
        const url = await locator?.getUrl({ params: { sloId: slo.id } });
        // since basePath is already included in the kibanaUrl, we need to remove it from the start of url
        const urlWithoutBasePath = url?.replace(basePath, '');
        openRemoteKibana(slo.remote.kibanaUrl, urlWithoutBasePath);
      } else {
        if (slo.id && locator) {
          locator.navigate({ params: { sloId: slo.id } }, { replace: false });
        }
      }
    }
  };

  const detailsUrl = paths.sloDetails(
    slo.id,
    ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined,
    slo.remote?.remoteName
  );

  const remoteDeleteUrl = createRemoteSloDeleteUrl(slo, spaceId);

  const sloEditUrl = slo.remote
    ? createRemoteSloEditUrl(slo, spaceId)
    : http.basePath.prepend(paths.sloEdit(slo.id));

  return {
    sloEditUrl,
    handleNavigateToRules,
    remoteDeleteUrl,
    sloDetailsUrl: http.basePath.prepend(detailsUrl),
  };
};
