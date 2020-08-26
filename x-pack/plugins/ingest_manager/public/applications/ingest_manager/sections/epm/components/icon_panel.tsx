/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import { EuiIcon, EuiPanel } from '@elastic/eui';
import { usePackageIconType, UsePackageIconType } from '../../../hooks';
import { Loading } from '../../../components';

const PanelWrapper = styled.div`
  width: ${(props) =>
    parseFloat(props.theme.eui.euiSize) * 6 + parseFloat(props.theme.eui.spacerSizes.xl) * 2}px;
  height: 1px;
`;

const Panel = styled(EuiPanel)`
  padding: ${(props) => props.theme.eui.spacerSizes.xl};
  margin-bottom: -100%;
  svg,
  img {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    width: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
  }
  .euiFlexItem {
    height: ${(props) => parseFloat(props.theme.eui.euiSize) * 6}px;
    justify-content: center;
  }
`;

export function IconPanel({
  packageName,
  version,
  icons,
}: Pick<UsePackageIconType, 'packageName' | 'version' | 'icons'>) {
  const iconType = usePackageIconType({ packageName, version, icons });

  return (
    <PanelWrapper>
      <Panel>
        <EuiIcon type={iconType} size="original" />
      </Panel>
    </PanelWrapper>
  );
}

export function LoadingIconPanel() {
  return (
    <PanelWrapper>
      <Panel>
        <Loading />
      </Panel>
    </PanelWrapper>
  );
}
