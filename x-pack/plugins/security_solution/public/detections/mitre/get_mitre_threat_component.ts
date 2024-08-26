/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SearchHit } from '../../../common/search_strategy';
import { buildThreatDescription } from '../../detection_engine/rule_creation_ui/components/description_step/helpers';

// TODO: MOVE TO FLYOUT FOLDER - https://github.com/elastic/security-team/issues/7462
export const getMitreComponentParts = (searchHit?: SearchHit) => {
  const ruleParameters = searchHit?.fields
    ? searchHit?.fields['kibana.alert.rule.parameters']
    : null;
  const threat = ruleParameters ? (ruleParameters[0]?.threat as Threats) : null;
  return threat && threat.length > 0
    ? buildThreatDescription({
        label: threat[0].framework,
        threat,
      })
    : null;
};
