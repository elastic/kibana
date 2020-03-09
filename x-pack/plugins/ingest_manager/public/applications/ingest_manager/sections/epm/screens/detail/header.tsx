/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle, IconType, EuiButton } from '@elastic/eui';
import { PackageInfo } from '../../../../types';
import { EPM_PATH } from '../../../../constants';
import { useLink } from '../../../../hooks';
import { IconPanel } from '../../components/icon_panel';
import { NavButtonBack } from '../../components/nav_button_back';
import { Version } from '../../components/version';
import { useLinks } from '../../hooks';
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
  const { iconType, name, title, version } = props;
  const { toListView } = useLinks();
  // useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  const ADD_DATASOURCE_URI = useLink(`${EPM_PATH}/${name}-${version}/add-datasource`);

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
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton iconType="plusInCircle" href={ADD_DATASOURCE_URI}>
                <FormattedMessage
                  id="xpack.ingestManager.epm.addDatasourceButtonText"
                  defaultMessage="Create data source"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </RightColumn>
      </EuiFlexGroup>
    </Fragment>
  );
}
