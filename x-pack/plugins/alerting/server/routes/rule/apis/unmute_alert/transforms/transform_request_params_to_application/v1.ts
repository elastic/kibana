/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnmuteAlertParams } from '../../../../../../application/rule/methods/unmute_alert/types';
import { RewriteRequestCase } from '../../../../../lib';
import { UnmuteAlertRequestParamsV1 } from '../../../../../schemas/rule/apis/unmute_alert';

export const transformRequestParamsToApplication: RewriteRequestCase<UnmuteAlertParams> = ({
  rule_id: alertId,
  alert_id: alertInstanceId,
}: UnmuteAlertRequestParamsV1) => ({
  alertId,
  alertInstanceId,
});
