/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {PublicKubernetesInsightClient} from '../services/kube_insight_api_client'
import { AppMountParameters, CoreSetup } from '@kbn/core/public';
import {KubernetesInsightComp} from '../components/kube_insight'
import { FormattedMessage } from '@kbn/i18n-react';



// This exists purely to facilitate legacy app/infra URL redirects.
// It will be removed in 8.0.0.
export const renderApp = (
    core: CoreSetup,
    { element }: AppMountParameters
  )=> {
    const publicK8sObservabilityClient = new PublicKubernetesInsightClient(core.http);

  ReactDOM.render(
    <KibanaPageTemplate
    solutionNav={undefined}>
      <KibanaPageTemplate.Header
      pageTitle={
                  <FormattedMessage
                    id="xpack.kubeInsight.kubeInsight.title"
                    defaultMessage="Kubernetes Insight PoC"
                  />
                }
      />
      <KibanaPageTemplate.Section
      color='subdued'
      paddingSize='xs'
      grow
      alignment='center'>
      <KubernetesInsightComp client={publicK8sObservabilityClient} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}