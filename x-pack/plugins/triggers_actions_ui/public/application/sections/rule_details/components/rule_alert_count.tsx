/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { formatRuleAlertCount } from '../../../../common/lib/format_rule_alert_count';

interface Props {
  version?: string;
  value: string;
}

export const RuleAlertCount = memo(({ version, value }: Props) => {
  return <>{formatRuleAlertCount(value, version)}</>;
});
