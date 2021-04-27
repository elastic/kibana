/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { INITIATING_VIEW } from '../series_builder/series_builder';

export function EmptyView({ loading }: { loading: boolean }) {
  const {
    services: { http },
  } = useKibana();

  return (
    <Wrapper>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          style={{
            top: 'initial',
          }}
        />
      )}
      <EuiSpacer />
      <ImageWrap
        alt="Visulization"
        url={http!.basePath.prepend(`/plugins/observability/assets/kibana_dashboard_light.svg`)}
      />
      <EuiText>{INITIATING_VIEW}</EuiText>
    </Wrapper>
  );
}

const ImageWrap = styled(EuiImage)`
  opacity: 0.4;
`;

const Wrapper = styled.div`
  text-align: center;
  height: 550px;
  position: relative;
`;
