/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const WorkChatHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate data-test-subj="workChatHomePage">
      <KibanaPageTemplate.Section flex-direction="column" restrictWidth={800} paddingSize="xl">
        <div>
          <h1>WorkChat Home</h1>
        </div>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
