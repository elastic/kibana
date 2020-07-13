/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleStatusType } from '../../../containers/detection_engine/rules';

export const getStatusColor = (status: RuleStatusType | string | null) =>
  status == null
    ? 'subdued'
    : status === 'succeeded'
    ? 'success'
    : status === 'failed'
    ? 'danger'
    : status === 'executing' || status === 'going to run'
    ? 'warning'
    : 'subdued';
