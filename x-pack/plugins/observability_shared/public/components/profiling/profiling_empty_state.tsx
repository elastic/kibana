/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiImage, EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import profilingImg from '../../images/profiling.png';

export function ProfilingEmptyState() {
  const { services } = useKibana();
  return (
    <EuiEmptyPrompt
      icon={<EuiImage size="fullWidth" src={profilingImg} alt="" />}
      title={
        <h2>
          {i18n.translate('xpack.observabilityShared.profilingEmptyState.title', {
            defaultMessage:
              'Improve computational efficiency. Debug performance regressions. Reduce cloud spend.',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      hasBorder
      hasShadow={false}
      body={
        <>
          <p>
            {i18n.translate('xpack.observabilityShared.profilingEmptyState.body', {
              defaultMessage:
                'Elastic Universal Profiling is a whole-system, always-on, continuous profiling solution that eliminates the need for code instrumentation, recompilation, on-host debug symbols, or service restarts. Leveraging eBPF, Universal Profiling operates within the Linux kernel space, capturing only the needed data with minimal overhead in an unobtrusive manner.',
            })}
          </p>
        </>
      }
      actions={[
        <EuiButton
          href={services.http?.basePath.prepend(`/app/profiling`)}
          data-test-subj="infraProfilingEmptyStateAddProfilingButton"
          color="primary"
          fill
        >
          {i18n.translate('xpack.observabilityShared.profilingEmptyState.addProfiling', {
            defaultMessage: 'Add profiling',
          })}
        </EuiButton>,
        <EuiLink
          href={`${services.docLinks?.ELASTIC_WEBSITE_URL}/guide/en/observability/${services.docLinks?.DOC_LINK_VERSION}/profiling-get-started.html`}
          data-test-subj="infraProfilingEmptyStateGoToDocsButton"
          target="_blank"
          external
        >
          {i18n.translate('xpack.observabilityShared.profilingEmptyState.goToDocs', {
            defaultMessage: 'Go to docs',
          })}
        </EuiLink>,
      ]}
    />
  );
}
