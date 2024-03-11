/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';
import React, { ReactElement, Suspense } from 'react';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { ActionAccordionFormProps } from './action_form';

export const suspendedActionFormWithProps = (
  ComponentToSuspend: (props: ActionAccordionFormProps) => ReactElement | null,
  size?: EuiLoadingSpinnerSize
) => {
  return (props: ActionAccordionFormProps) => (
    <Suspense fallback={<CenterJustifiedSpinner size={size ?? 'm'} />}>
      <ComponentToSuspend {...props} />
    </Suspense>
  );
};
