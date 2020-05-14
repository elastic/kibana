/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle, IconType, EuiButton } from '@elastic/eui';
import { PackageInfo } from '../../../../types';
import { EPM_PATH } from '../../../../constants';
import { useCapabilities, useLink } from '../../../../hooks';
import { IconPanel } from '../../components/icon_panel';
import { NavButtonBack } from '../../components/nav_button_back';
import { useLinks } from '../../hooks';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { UpdateIcon } from '../../components/icons';

const FullWidthNavRow = styled(EuiPage)`
  /* no left padding so link is against column left edge  */
  padding-left: 0;
`;

const Text = styled.span`
  margin-right: ${props => props.theme.eui.euiSizeM};
`;

type HeaderProps = PackageInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, name, title, version, latestVersion } = props;

  let installedVersion;
  if ('savedObject' in props) {
    installedVersion = props.savedObject.attributes.version;
  }
  const hasWriteCapabilites = useCapabilities().write;
  const { toListView } = useLinks();
  const ADD_DATASOURCE_URI = useLink(`${EPM_PATH}/${name}-${version}/add-datasource`);
  const updateAvailable = installedVersion && installedVersion < latestVersion ? true : false;
  return (
    <Fragment>
      <FullWidthNavRow>
        <NavButtonBack
          href={toListView()}
          text={i18n.translate('xpack.ingestManager.epm.browseAllButtonText', {
            defaultMessage: 'Browse all integrations',
          })}
        />
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
              <EuiTitle size="xs">
                <span>
                  {version} {updateAvailable && <UpdateIcon />}
                </span>
              </EuiTitle>
            </h1>
          </EuiTitle>
        </CenterColumn>
        <RightColumn>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                isDisabled={!hasWriteCapabilites}
                iconType="plusInCircle"
                href={ADD_DATASOURCE_URI}
              >
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
