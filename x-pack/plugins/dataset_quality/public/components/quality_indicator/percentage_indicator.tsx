/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil } from 'lodash';
import React from 'react';
import { QualityIndicator } from './indicator';

export function QualityPercentageIndicator({ percentage }: { percentage?: number }) {
  if (isNil(percentage)) {
    return <></>;
  }

  const quality = percentage > 3 ? 'poor' : percentage > 0 ? 'degraded' : 'good';

  return <QualityIndicator quality={quality} />;
}
