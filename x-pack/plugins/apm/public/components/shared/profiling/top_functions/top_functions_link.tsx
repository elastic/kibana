/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useProfilingPlugin } from '../../../../hooks/use_profiling_plugin';

interface Props {
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}

export function ProfilingTopNFunctionsLink({
  kuery,
  rangeFrom,
  rangeTo,
}: Props) {
  const { profilingLocators } = useProfilingPlugin();

  return (
    <EuiLink
      data-test-subj="apmProfilingTopNFunctionsGoToUniversalProfilingFlamegraphLink"
      href={profilingLocators?.topNFunctionsLocator.getRedirectUrl({
        kuery,
        rangeFrom,
        rangeTo,
      })}
    >
      {i18n.translate('xpack.apm.profiling.topnFunctions.link', {
        defaultMessage: 'Go to Universal Profiling Functions',
      })}
    </EuiLink>
  );
}
