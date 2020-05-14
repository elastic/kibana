/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPageProps } from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { DetailViewPanelName, InstallStatus } from '../../../../types';
import { PackageInfo } from '../../../../types';
import { useSetPackageInstallStatus } from '../../hooks';
import { Content } from './content';
import { Header } from './header';
import { sendGetPackageInfoByKey, usePackageIconType } from '../../../../hooks';

export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailParams {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

export function Detail() {
  // TODO: fix forced cast if possible
  const { pkgkey, panel = DEFAULT_PANEL } = useParams() as DetailParams;

  const [info, setInfo] = useState<PackageInfo | null>(null);
  const setPackageInstallStatus = useSetPackageInstallStatus();
  useEffect(() => {
    sendGetPackageInfoByKey(pkgkey).then(response => {
      const packageInfo = response.data?.response;
      const title = packageInfo?.title;
      const name = packageInfo?.name;
      let installedVersion;
      if (packageInfo && 'savedObject' in packageInfo) {
        installedVersion = packageInfo.savedObject.attributes.version;
      }
      const status: InstallStatus = packageInfo?.status as any;

      // track install status state
      if (name) {
        setPackageInstallStatus({ name, status, version: installedVersion || null });
      }
      if (packageInfo) {
        setInfo({ ...packageInfo, title: title || '' });
      }
    });
  }, [pkgkey, setPackageInstallStatus]);

  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

const FullWidthHeader = styled(EuiPage)`
  border-bottom: ${props => props.theme.eui.euiBorderThin};
  padding-bottom: ${props => props.theme.eui.paddingSizes.xl};
`;

const FullWidthContent = styled(EuiPage)`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  padding-top: ${props => parseInt(props.theme.eui.paddingSizes.xl, 10) * 1.25}px;
  flex-grow: 1;
`;

type LayoutProps = PackageInfo & Pick<DetailParams, 'panel'> & Pick<EuiPageProps, 'restrictWidth'>;
export function DetailLayout(props: LayoutProps) {
  const { name: packageName, version, icons, restrictWidth } = props;
  const iconType = usePackageIconType({ packageName, version, icons });
  return (
    <Fragment>
      <FullWidthHeader>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header iconType={iconType} {...props} />
        </EuiPageBody>
      </FullWidthHeader>
      <FullWidthContent>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasIconPanel={!!iconType} {...props} />
        </EuiPageBody>
      </FullWidthContent>
    </Fragment>
  );
}
