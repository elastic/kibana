/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus } from '../../../../types';
import { useLink } from '../../../../hooks';

interface PackagePoliciesPanelProps {
  name: string;
  version: string;
}
export const PackagePoliciesPanel = ({ name, version }: PackagePoliciesPanelProps) => {
  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);
  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed)
    return <Redirect to={getPath('integration_details', { pkgkey: `${name}-${version}` })} />;
  return null;
};
