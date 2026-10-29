/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexGroupProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import type { ProfilingSchema } from '@kbn/profiling-utils';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useProfilingPlugin } from '../../../../hooks/use_profiling_plugin';

interface Props {
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
  schema?: ProfilingSchema;
  justifyContent?: EuiFlexGroupProps['justifyContent'];
}

export function ProfilingFlamegraphLink({
  kuery,
  rangeFrom,
  rangeTo,
  schema,
  justifyContent = 'flexStart',
}: Props) {
  const { profilingLocators } = useProfilingPlugin();
  return (
    <EuiFlexGroup justifyContent={justifyContent}>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="apmProfilingFlamegraphGoToFlamegraphLink"
          href={profilingLocators?.flamegraphLocator.getRedirectUrl({
            kuery,
            rangeFrom,
            rangeTo,
            schema,
          })}
        >
          {i18n.translate('xpack.apm.profiling.flamegraph.link', {
            defaultMessage: 'Go to Profiling Flamegraph',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
