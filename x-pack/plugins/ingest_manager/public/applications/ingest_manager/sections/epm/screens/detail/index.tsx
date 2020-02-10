/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPageProps, ICON_TYPES } from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { DetailViewPanelName } from '../../types';
import { PackageInfo } from '../../../../../../../common/types/epm';
import { getPackageInfoByKey } from '../../data';
// import { useSetPackageInstallStatus } from '../../hooks';
// import { useCore } from '../../hooks/use_core';
// import { InstallStatus } from '../../types';
import { Content } from './content';
import { Header } from './header';

export const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export interface DetailParams {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

export function Detail() {
  // XXX fix forced cast if possible
  const { pkgkey, panel } = useParams() as DetailParams;
  const [info, setInfo] = useState<PackageInfo | null>(null);
  // const setPackageInstallStatus = useSetPackageInstallStatus();
  useEffect(() => {
    getPackageInfoByKey(pkgkey).then(response => {
      // const { title, name } = response;
      const { title } = response;
      // const status: InstallStatus = response.status as any;
      // track install status state
      // setPackageInstallStatus({ name, status });
      setInfo({ ...response, title });
    });
  }, [pkgkey]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

type LayoutProps = PackageInfo & Pick<DetailParams, 'panel'> & Pick<EuiPageProps, 'restrictWidth'>;
export function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth } = props;
  // const { theme } = useCore();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);

  // const FullWidthHeader = styled(EuiPage)`
  //   border-bottom: ${theme.eui.euiBorderThin};
  //   padding-bottom: ${theme.eui.paddingSizes.xl};
  // `;

  // XXX restore once theme is available

  const FullWidthHeader = styled(EuiPage)`
    border-bottom: 0;
    padding-bottom: 0;
  `;

  // const paddingSizeTop: number = parseInt(theme.eui.paddingSizes.xl, 10) * 1.25;
  // const FullWidthContent = styled(EuiPage)`
  //   background-color: ${theme.eui.euiColorEmptyShade};
  //   padding-top: ${paddingSizeTop}px;
  //   flex-grow: 1;
  // `;

  // XXX restore once theme is available
  const FullWidthContent = styled(EuiPage)`
    background-color: #ffcccc;
    padding-top: 10px;
    flex-grow: 1;
  `;

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
