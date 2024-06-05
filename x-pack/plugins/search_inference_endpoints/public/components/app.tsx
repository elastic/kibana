/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { InferenceEndpoints } from './inference_endpoints';

interface AppProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  setIsInferenceFlyoutVisible: (visible: boolean) => void;
  addEndpointLabel: string;
}

export const App: React.FC<AppProps> = ({
  inferenceEndpoints,
  setIsInferenceFlyoutVisible,
  addEndpointLabel,
}) => {
  return (
    <KibanaPageTemplate.Section
      alignment="top"
      restrictWidth={false}
      grow
      css={{
        position: 'relative',
      }}
      contentProps={{ css: { display: 'flex', flexGrow: 1, position: 'absolute', inset: 0 } }}
      paddingSize="none"
      className="eui-yScroll"
    >
      <InferenceEndpoints
        inferenceEndpoints={inferenceEndpoints}
        setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
        addEndpointLabel={addEndpointLabel}
      />
    </KibanaPageTemplate.Section>
  );
};
