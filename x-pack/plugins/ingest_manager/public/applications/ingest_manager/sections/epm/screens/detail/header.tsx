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
import { useCapabilities, useLink } from '../../../../hooks';
import { IconPanel } from '../../components/icon_panel';
import { NavButtonBack } from '../../components/nav_button_back';
import { CenterColumn, LeftColumn, RightColumn } from './layout';
import { UpdateIcon } from '../../components/icons';

const FullWidthNavRow = styled(EuiPage)`
  /* no left padding so link is against column left edge  */
  padding-left: 0;
`;

const Text = styled.span`
  margin-right: ${(props) => props.theme.eui.euiSizeM};
`;

type HeaderProps = PackageInfo & { iconType?: IconType };

export function Header(props: HeaderProps) {
  const { iconType, name, title, version, latestVersion } = props;

  let installedVersion;
  if ('savedObject' in props) {
    installedVersion = props.savedObject.attributes.version;
  }
  const hasWriteCapabilites = useCapabilities().write;
  const { getHref } = useLink();
  const updateAvailable = installedVersion && installedVersion < latestVersion ? true : false;
  return (
    <Fragment>
      <FullWidthNavRow>
        <NavButtonBack
          href={getHref('integrations_all')}
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
                href={getHref('add_datasource_from_integration', { pkgkey: `${name}-${version}` })}
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
