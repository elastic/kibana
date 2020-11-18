/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Redirect, useParams } from 'react-router-dom';
import { DetailParams } from '.';
import { PackageInfo } from '../../../../types';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { PackagePoliciesPanel } from './package_policies_panel';
import { SettingsPanel } from './settings_panel';
import { useUIExtension } from '../../../../hooks/use_ui_extension';
import { ExtensionWrapper } from '../../../../components/extension_wrapper';
import { useLink } from '../../../../hooks';

type ContentProps = PackageInfo & Pick<DetailParams, 'panel'>;

const SideNavColumn = styled(LeftColumn)`
  /* 🤢🤷 https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity */
  &&& {
    margin-top: 77px;
  }
`;

// fixes IE11 problem with nested flex items
const ContentFlexGroup = styled(EuiFlexGroup)`
  flex: 0 0 auto !important;
`;

export function Content(props: ContentProps) {
  return (
    <ContentFlexGroup>
      <SideNavColumn />
      <CenterColumn>
        <ContentPanel {...props} />
      </CenterColumn>
      <RightColumn>
        <RightColumnContent {...props} />
      </RightColumn>
    </ContentFlexGroup>
  );
}

type ContentPanelProps = PackageInfo & Pick<DetailParams, 'panel'>;
export function ContentPanel(props: ContentPanelProps) {
  const { panel, name, version, assets, title, removable, latestVersion } = props;
  const CustomView = useUIExtension(name, 'package-detail-custom');
  const { getPath } = useLink();
  const { pkgkey } = useParams<{ pkgkey?: string }>();

  switch (panel) {
    case 'settings':
      return (
        <SettingsPanel
          name={name}
          version={version}
          assets={assets}
          title={title}
          removable={removable}
          latestVersion={latestVersion}
        />
      );
    case 'policies':
      return <PackagePoliciesPanel name={name} version={version} />;
    case 'custom':
      return (
        (CustomView && (
          <ExtensionWrapper>
            <CustomView />
          </ExtensionWrapper>
        )) || <Redirect to={getPath('integration_details', { pkgkey: pkgkey ?? '' })} />
      );
    case 'overview':
    default:
      return <OverviewPanel {...props} />;
  }
}

type RightColumnContentProps = PackageInfo & Pick<DetailParams, 'panel'>;
function RightColumnContent(props: RightColumnContentProps) {
  const { assets, panel } = props;
  switch (panel) {
    case 'overview':
      return assets ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <AssetsFacetGroup assets={assets} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null;
    default:
      return <EuiSpacer />;
  }
}
