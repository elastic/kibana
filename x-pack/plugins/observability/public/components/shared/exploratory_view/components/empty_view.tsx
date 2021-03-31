/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage } from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

export function EmptyView() {
  const {
    services: { http },
  } = useKibana();

  return (
    <Wrapper>
      <EuiImage
        alt="Visulization"
        url={http!.basePath.prepend(`/plugins/observability/assets/kibana_dashboard_light.svg`)}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  text-align: center;
  opacity: 0.4;
  height: 550px;
`;
