/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';
import { PackageInfo, entries, DetailViewPanelName, InstallStatus } from '../../../../types';
import { useLink } from '../../../../hooks';
import { useGetPackageInstallStatus } from '../../hooks';

export type NavLinkProps = Pick<PackageInfo, 'name' | 'version'> & {
  active: DetailViewPanelName;
};

const PanelDisplayNames: Record<DetailViewPanelName, string> = {
  overview: i18n.translate('xpack.ingestManager.epm.packageDetailsNav.overviewLinkText', {
    defaultMessage: 'Overview',
  }),
  'data-sources': i18n.translate('xpack.ingestManager.epm.packageDetailsNav.datasourcesLinkText', {
    defaultMessage: 'Data sources',
  }),
  settings: i18n.translate('xpack.ingestManager.epm.packageDetailsNav.settingsLinkText', {
    defaultMessage: 'Settings',
  }),
};

export function SideNavLinks({ name, version, active }: NavLinkProps) {
  const { getHref } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);

  return (
    <Fragment>
      {entries(PanelDisplayNames).map(([panel, display]) => {
        const Link = styled(EuiButtonEmpty).attrs<EuiButtonEmptyProps>({
          href: getHref('integration_details', { pkgkey: `${name}-${version}`, panel }),
        })`
          font-weight: ${(p) =>
            active === panel
              ? p.theme.eui.euiFontWeightSemiBold
              : p.theme.eui.euiFontWeightRegular};
        `;
        // Don't display Data Sources tab as we haven't implemented this yet
        // FIXME: Restore when we implement data sources page
        if (
          panel === 'data-sources' &&
          (true || packageInstallStatus.status !== InstallStatus.installed)
        )
          return null;

        return (
          <div key={panel}>
            <Link>{display}</Link>
          </div>
        );
      })}
    </Fragment>
  );
}
