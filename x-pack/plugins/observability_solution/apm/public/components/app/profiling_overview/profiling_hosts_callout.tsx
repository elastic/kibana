/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { useLocalStorage } from '../../../hooks/use_local_storage';

interface Props {
  serviceName: string;
}

export function ProfilingHostsCallout({ serviceName }: Props) {
  const { services } = useKibana<ApmPluginStartDeps>();

  const baseUrl = services.docLinks?.ELASTIC_WEBSITE_URL || 'https://www.elastic.co/';

  const [apmUniversalProfilingShowCallout, setAPMUniversalProfilingShowCallout] = useLocalStorage(
    'apmUniversalProfilingShowCallout',
    true
  );

  if (apmUniversalProfilingShowCallout === false) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.profiling.callout.title', {
        defaultMessage:
          'Displaying profiling insights from the host(s) running {serviceName} services',
        values: { serviceName },
      })}
      color="primary"
      iconType="iInCircle"
    >
      <p>
        {i18n.translate('xpack.apm.profiling.callout.description', {
          defaultMessage:
            'Universal Profiling provides unprecedented code visibility into the runtime behaviour of all applications. It profiles every line of code on the host(s) running your services, including not only your application code but also the kernel and third-party libraries.',
        })}
      </p>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiLink
            href={`${baseUrl}observability/universal-profiling`}
            target="_blank"
            data-test-subj="apmProfilingOverviewLearnMoreLink"
          >
            {i18n.translate('xpack.apm.profiling.callout.learnMore', {
              defaultMessage: 'Learn more',
            })}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="apmProfilingOverviewLinkButtonButton"
            color="primary"
            onClick={() => setAPMUniversalProfilingShowCallout(false)}
          >
            {i18n.translate('xpack.apm.profiling.callout.dismiss', {
              defaultMessage: 'Dismiss',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
