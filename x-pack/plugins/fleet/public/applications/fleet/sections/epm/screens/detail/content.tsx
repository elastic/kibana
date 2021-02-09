/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { Redirect } from 'react-router-dom';
import { DetailParams } from '.';
import { DetailViewPanelName, PackageInfo } from '../../../../types';
import { AssetsFacetGroup } from '../../components/assets_facet_group';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { OverviewPanel } from './overview_panel';
import { PackagePoliciesPanel } from './package_policies_panel';
import { SettingsPanel } from './settings_panel';
import { useUIExtension } from '../../../../hooks/use_ui_extension';
import { ExtensionWrapper } from '../../../../components/extension_wrapper';
import { useLink } from '../../../../hooks';
import { pkgKeyFromPackageInfo } from '../../../../services/pkg_key_from_package_info';

type ContentProps = PackageInfo & Pick<DetailParams, 'panel'>;

const LeftSideColumn = styled(LeftColumn)`
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
  const { panel } = props;
  const showRightColumn = useMemo(() => {
    const fullWidthContentPages: DetailViewPanelName[] = ['policies', 'custom'];
    return !fullWidthContentPages.includes(panel!);
  }, [panel]);

  return (
    <ContentFlexGroup>
      <LeftSideColumn {...(!showRightColumn ? { columnGrow: 1 } : undefined)} />
      <CenterColumn {...(!showRightColumn ? { columnGrow: 6 } : undefined)}>
        <ContentPanel panel={panel!} packageInfo={props} />
      </CenterColumn>
      {showRightColumn && (
        <RightColumn>
          <RightColumnContent {...props} />
        </RightColumn>
      )}
    </ContentFlexGroup>
  );
}

interface ContentPanelProps {
  packageInfo: PackageInfo;
  panel: DetailViewPanelName;
}
export const ContentPanel = memo<ContentPanelProps>(({ panel, packageInfo }) => {
  const { name, version, assets, title, removable, latestVersion } = packageInfo;
  const pkgkey = pkgKeyFromPackageInfo(packageInfo);

  const CustomView = useUIExtension(name, 'package-detail-custom');
  const { getPath } = useLink();

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
      return CustomView ? (
        <ExtensionWrapper>
          <CustomView pkgkey={pkgkey} packageInfo={packageInfo} />
        </ExtensionWrapper>
      ) : (
        <Redirect to={getPath('integration_details', { pkgkey })} />
      );
    case 'overview':
    default:
      return <OverviewPanel {...packageInfo} />;
  }
});

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
