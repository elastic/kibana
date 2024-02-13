/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';
import React, { ReactElement, Suspense } from 'react';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { AddConnectorInFormProps } from './connector_add_inline';

export const suspendedConnectorInlineWithProps = <
  T extends 'withSystemAction' | 'defaultAction' = 'defaultAction'
>(
  ComponentToSuspend: <P extends 'withSystemAction' | 'defaultAction' = T>(
    props: AddConnectorInFormProps<P>
  ) => ReactElement | null,
  size?: EuiLoadingSpinnerSize
) => {
  return <K extends 'withSystemAction' | 'defaultAction' = T>(
    props: AddConnectorInFormProps<K>
  ) => (
    <Suspense fallback={<CenterJustifiedSpinner size={size ?? 'm'} />}>
      <ComponentToSuspend<K> {...props} />
    </Suspense>
  );
};
