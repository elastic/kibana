/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { TopAlert } from '../../typings/alerts';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

export function AlertsFlyoutHeader({ alert }: FlyoutProps) {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
        <h2>{alert.fields[ALERT_RULE_NAME]}</h2>
      </EuiTitle>
    </>
  );
}
