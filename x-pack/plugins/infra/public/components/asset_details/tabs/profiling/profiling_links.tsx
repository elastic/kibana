/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HOST_FIELD } from '../../../../../common/constants';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

const PROFILING_FEEDBACK_URL = 'https://ela.st/profiling-feedback';

export type ProfilingPath = 'flamegraphs' | 'functions';

interface Props {
  hostname: string;
  profilingPath: ProfilingPath;
}

export function ProfilingLinks({ hostname, profilingPath }: Props) {
  const { services } = useKibanaContextForPlugin();
  const queryParams = new URLSearchParams({
    kuery: `${HOST_FIELD}:"${hostname}"`,
  });
  const profilingLinkURL = services.http.basePath.prepend(
    `/app/profiling/${profilingPath}?${queryParams}`
  );
  const profilingLinkLabel =
    profilingPath === 'flamegraphs'
      ? i18n.translate('xpack.infra.flamegraph.profilingAppFlamegraphLink', {
          defaultMessage: 'Go to Universal Profiling Flamegraph',
        })
      : i18n.translate('xpack.infra.flamegraph.profilingAppFunctionsLink', {
          defaultMessage: 'Go to Universal Profiling Functions',
        });

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="infraFlamegraphTestLink" href={profilingLinkURL}>
          {profilingLinkLabel}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="infraFlamegraphTestLink" href={PROFILING_FEEDBACK_URL} external>
          {i18n.translate('xpack.infra.flamegraph.profilingFeedbackLink', {
            defaultMessage: 'Give feedback about profiling',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
