/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiExpression } from '@elastic/eui';

import { OS_LABELS } from '../conditions.config';
import * as i18n from '../../translations';
import type { OsConditionsProps } from '../types';

export const OsCondition = memo<OsConditionsProps>(({ os, dataTestSubj }) => {
  const osLabel = useMemo(() => {
    if (os != null && os.length) {
      return os
        .map((osValue) => OS_LABELS[osValue as keyof typeof OS_LABELS] ?? osValue)
        .join(', ');
    }

    return null;
  }, [os]);
  return osLabel ? (
    <div data-test-subj={`${dataTestSubj}-os`}>
      <strong>
        <EuiExpression description="" value={i18n.CONDITION_OS} />
        <EuiExpression description={i18n.CONDITION_OPERATOR_TYPE_MATCH} value={osLabel} />
      </strong>
    </div>
  ) : null;
});
OsCondition.displayName = 'OsCondition';
