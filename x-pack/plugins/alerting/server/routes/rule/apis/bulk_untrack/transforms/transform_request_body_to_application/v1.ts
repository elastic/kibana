/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '../../../../../lib';
import { BulkUntrackBody } from '../../../../../../application/rule/methods/bulk_untrack/types';

export const transformRequestBodyToApplication: RewriteRequestCase<BulkUntrackBody> = ({
  indices,
  alert_uuids: alertUuids,
}) => ({
  indices,
  alertUuids,
});
