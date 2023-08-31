/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSignatureId,
  RuleVersion,
} from '../../../../../../common/api/detection_engine/model/rule_schema';

export interface RuleVersionSpecifier {
  rule_id: RuleSignatureId;
  version: RuleVersion;
}
