/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';

import { ELSER_TASK_TYPE } from '../../../../../../common/ml_inference_pipeline';

export const MLModelTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === ELSER_TASK_TYPE) {
    return <EuiBadge color="success">ELSER</EuiBadge>;
  }
  return <EuiBadge color="hollow">{type}</EuiBadge>;
};
