/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle, IconType } from '@elastic/eui';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { PackageInfo } from '../../../../types';
import { IconPanel } from '../../components/icon_panel';
import { NavButtonBack } from '../../components/nav_button_back';
import { Version } from '../../components/version';
import { useLinks } from '../../hooks';
import { InstallationButton } from './installation_button';
import { CenterColumn, LeftColumn, RightColumn } from './layout';

const FullWidthNavRow = styled(EuiPage)`
  /* no left padding so link is against column left edge  */
  padding-left: 0;
`;

const Text = styled.span`
  margin-right: ${props => props.theme.eui.euiSizeM};
`;

const StyledVersion = styled(Version)`
  font-size: ${props => props.theme.eui.euiFontSizeS};
  color: ${props => props.theme.eui.euiColorDarkShade};
`;

type HeaderProps = PackageInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, title, version } = props;
  const { toListView } = useLinks();
  // useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  return (
    <Fragment>
      <FullWidthNavRow>
        <NavButtonBack href={toListView()} text="Browse Packages" />
      </FullWidthNavRow>
      <EuiFlexGroup>
        {iconType ? (
          <LeftColumn>
            <IconPanel iconType={iconType} />
          </LeftColumn>
        ) : null}
        <CenterColumn>
          <EuiTitle size="l">
            <h1>
              <Text>{title}</Text>
              <StyledVersion version={version} />
            </h1>
          </EuiTitle>
        </CenterColumn>
        <RightColumn>
          <EuiFlexGroup direction="column" alignItems="flexEnd">
            <EuiFlexItem grow={false}>
              <InstallationButton package={props} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </RightColumn>
      </EuiFlexGroup>
    </Fragment>
  );
}
