/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { ALERTS_EMPTY_DESCRIPTION } from '../translations';

export const CaseViewAlertsEmpty = () => {
  return (
    <EuiEmptyPrompt
      data-test-subj="caseViewAlertsEmpty"
      iconType="casesApp"
      iconColor="default"
      titleSize="xs"
      body={<p>{ALERTS_EMPTY_DESCRIPTION}</p>}
    />
  );
};
CaseViewAlertsEmpty.displayName = 'CaseViewAlertsEmpty';
