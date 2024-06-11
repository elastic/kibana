/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';

import type { UsePackageIconType } from '../../../../../hooks';
import { usePackageIconType } from '../../../../../hooks';
import { Loading } from '../../../../../components';

export function IconPanel({
  packageName,
  integrationName,
  version,
  icons,
}: Pick<UsePackageIconType, 'packageName' | 'integrationName' | 'version' | 'icons'>) {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons });

  const { euiTheme } = useEuiTheme();
  const Panel = styled(EuiPanel)`
    padding: ${euiTheme.size.xl};
    width: ${parseFloat(euiTheme.size.base) * 6 + parseFloat(euiTheme.size.xl) * 2}px;
    svg,
    img {
      height: ${parseFloat(euiTheme.size.base) * 6}px;
      width: ${parseFloat(euiTheme.size.base) * 6}px;
    }
    .euiFlexItem {
      height: ${parseFloat(euiTheme.size.base) * 6}px;
      justify-content: center;
    }
  `;

  return (
    <Panel>
      <EuiIcon type={iconType} size="original" />
    </Panel>
  );
}

export function LoadingIconPanel() {
  const { euiTheme } = useEuiTheme();
  const Panel = styled(EuiPanel)`
    padding: ${euiTheme.size.xl};
    width: ${parseFloat(euiTheme.size.base) * 6 + parseFloat(euiTheme.size.xl) * 2}px;
    svg,
    img {
      height: ${parseFloat(euiTheme.size.base) * 6}px;
      width: ${parseFloat(euiTheme.size.base) * 6}px;
    }
    .euiFlexItem {
      height: ${parseFloat(euiTheme.size.base) * 6}px;
      justify-content: center;
    }
  `;

  return (
    <Panel>
      <Loading />
    </Panel>
  );
}
