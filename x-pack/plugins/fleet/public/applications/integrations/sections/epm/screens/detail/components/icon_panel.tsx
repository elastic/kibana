/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiIcon, EuiPanel } from '@elastic/eui';

import type { UsePackageIconType } from '../../../../../hooks';
import { usePackageIconType } from '../../../../../hooks';
import { Loading } from '../../../../../components';

const PanelWrapper = styled.div`
  // NOTE: changes to the width here will impact navigation tabs page layout under integration package details
  width: ${(props) =>
    parseFloat(props.theme.eui.euiSize) * 6 + parseFloat(props.theme.eui.euiSizeXL) * 2}px;
  height: 1px;
  z-index: 1;
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
  integrationName,
  version,
  icons,
}: Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'>) {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons });

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
