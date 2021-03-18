/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage } from '@elastic/eui';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import styled from 'styled-components';

export const EmptyView = () => {
  const { core } = usePluginContext();

  return (
    <Wrapper>
      <EuiImage
        alt="Visulization"
        url={core.http.basePath.prepend(`/plugins/observability/assets/kibana_dashboard_light.svg`)}
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  text-align: center;
  opacity: 0.4;
  height: 550pz;
`;
