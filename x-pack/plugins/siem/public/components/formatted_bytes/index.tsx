/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { useContext } from 'react';
import numeral from '@elastic/numeral';

import {
  AppKibanaFrameworkAdapter,
  KibanaConfigContext,
} from '../../lib/adapters/framework/kibana_framework_adapter';

export const PreferenceFormattedBytes = React.memo<{ value: string | number }>(({ value }) => {
  const config: Partial<AppKibanaFrameworkAdapter> = useContext(KibanaConfigContext);
  return (
    <>
      {config.bytesFormat
        ? numeral(value).format(config.bytesFormat)
        : numeral(value).format('0,0.[000]b')}
    </>
  );
});
