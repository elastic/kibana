/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Fields from '../../../common/experimental_rule_data_field_names';

export const experimentalRuleFieldMap = {
  [Fields.ALERT_INSTANCE_ID]: { type: 'keyword', index: false },
};
