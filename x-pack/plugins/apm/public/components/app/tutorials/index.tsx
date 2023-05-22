/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { ApmPluginStartDeps } from '../../../plugin';
import { Introduction } from './introduction';
import { InstructionsSet } from './instructions_set';
import { serverlessInstructions } from './serverless_instructions';
import { Footer } from './footer';

export function Tutorials() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { docLinks, observabilityShared } = services;
  const guideLink =
    docLinks?.links.kibana.guide ||
    'https://www.elastic.co/guide/en/kibana/current/index.html';

  const baseUrl = docLinks?.ELASTIC_WEBSITE_URL || 'https://www.elastic.co/';

  const commonOptions = {
    baseUrl,
  };

  const serverless = serverlessInstructions(commonOptions);

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;
  return (
    <ObservabilityPageTemplate>
      <Introduction isBeta={false} guideLink={guideLink} />
      <EuiSpacer />
      <InstructionsSet instructions={serverless} />
      <Footer />
    </ObservabilityPageTemplate>
  );
}
