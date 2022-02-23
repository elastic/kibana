/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import {
  AddAlertToNewCaseButton,
  AddAlertToNewCaseButtonProps,
} from '../components/actions/add_alert_to_new_case_button';

export const AddAlertToNewCaseButtonLazy = (props: AddAlertToNewCaseButtonProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AddAlertToNewCaseButton {...props} />
    </Suspense>
  );
};
AddAlertToNewCaseButtonLazy.displayName = 'AddAlertToNewCaseButtonLazy';
