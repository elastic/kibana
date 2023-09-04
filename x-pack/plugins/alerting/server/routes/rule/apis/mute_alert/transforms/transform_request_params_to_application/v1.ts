/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMuteAlertOptions } from '../../../../../../application/rule/types';
import { RewriteRequestCase } from '../../../../../lib';

export const transformRequestParamsToApplication: RewriteRequestCase<RuleMuteAlertOptions> = ({
  rule_id: alertId,
  alert_id: alertInstanceId,
}) => ({
  alertId,
  alertInstanceId,
});
