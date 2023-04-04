/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SearchHit, TimelineEventsDetailsItem } from '../../../common/search_strategy';
import { buildThreatDescription } from '../components/rules/description_step/helpers';
import type { ListItems } from '../components/rules/description_step/types';
import { buildThreatObjectFromFieldsApi } from './build_threat_object_from_fields_api';

export const getMitreComponentPartsArray = (
  searchHit?: SearchHit,
  data?: TimelineEventsDetailsItem[] | null
) => {
  const allThreatData: Threats[] = [];
  const ruleParameters = searchHit?.fields
    ? searchHit?.fields['kibana.alert.rule.parameters']
    : null;

  if (ruleParameters) allThreatData.push(ruleParameters[0]?.threat as Threats);
  if (data) allThreatData.push(buildThreatObjectFromFieldsApi(data) as Threats);

  const threatComponents =
    allThreatData.length > 0
      ? allThreatData.map((threat) =>
          threat && threat[0]
            ? buildThreatDescription({
                label: threat[0].framework,
                threat,
              })
            : null
        )
      : [];

  return threatComponents.filter((threat) => threat != null) as ListItems[][];
};
