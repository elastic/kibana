/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FlamegraphLocator } from '@kbn/observability-shared-plugin/public/locators/profiling/flamegraph_locator';
import { TopNFunctionsLocator } from '@kbn/observability-shared-plugin/public/locators/profiling/topn_functions_locator';
import { StacktracesLocator } from '@kbn/observability-shared-plugin/public/locators/profiling/stacktraces_locator';
import { HOST_NAME_FIELD } from '../../../../../common/constants';

const PROFILING_FEEDBACK_URL = 'https://ela.st/profiling-feedback';

interface Props {
  hostname: string;
  from: string;
  to: string;
  profilingLinkLocator: FlamegraphLocator | TopNFunctionsLocator | StacktracesLocator;
  profilingLinkLabel: string;
}

export function ProfilingLinks({
  hostname,
  from,
  to,
  profilingLinkLocator,
  profilingLinkLabel,
}: Props) {
  const profilingLinkURL = profilingLinkLocator.getRedirectUrl({
    kuery: `${HOST_NAME_FIELD}:"${hostname}"`,
    rangeFrom: from,
    rangeTo: to,
  });

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="infraFlamegraphTestLink" href={profilingLinkURL}>
          {profilingLinkLabel}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="infraFlamegraphTestLink"
          href={PROFILING_FEEDBACK_URL}
          external
          target="_blank"
        >
          {i18n.translate('xpack.infra.flamegraph.profilingFeedbackLink', {
            defaultMessage: 'Give feedback',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
