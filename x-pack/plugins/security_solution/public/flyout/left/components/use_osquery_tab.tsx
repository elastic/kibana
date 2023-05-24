/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { Ecs } from '@kbn/cases-plugin/common';
import type { SearchHit } from '../../../../common/search_strategy';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useKibana } from '../../../common/lib/kibana';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas/response_actions';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';

export const useOsqueryTab = ({
  rawEventData,
  ecsData,
}: {
  rawEventData: SearchHit | undefined;
  ecsData: Ecs | null;
}) => {
  const {
    services: { osquery },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );

  const shouldEarlyReturn =
    !rawEventData || !responseActionsEnabled || endpointResponseActionsEnabled || !ecsData;
  const alertId = rawEventData?._id ?? '';

  const { OsqueryResults, fetchAllLiveQueries } = osquery;

  const { data: actionsData } = fetchAllLiveQueries({
    filterQuery: { term: { alert_ids: alertId } },
    alertId,
    skip: shouldEarlyReturn,
  });

  if (shouldEarlyReturn) {
    return;
  }

  const expandedEventFieldsObject = expandDottedObject(
    (rawEventData as RawEventData).fields
  ) as ExpandedEventFieldsObject;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const osqueryResponseActions = responseActions?.filter(
    (responseAction) => responseAction.action_type_id === RESPONSE_ACTION_TYPES.OSQUERY
  );

  if (!osqueryResponseActions?.length) {
    return;
  }

  const actionItems = actionsData?.data.items || [];

  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name;

  return (
    <>
      <OsqueryResults ruleName={ruleName} actionItems={actionItems} ecsData={ecsData} />
      <EuiSpacer size="s" />
    </>
  );
};
