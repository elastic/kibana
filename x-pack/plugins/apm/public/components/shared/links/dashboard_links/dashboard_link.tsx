/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { Location } from 'history';
import { IBasePath } from '@kbn/core/public';
import React from 'react';
import { useLocation } from 'react-router-dom';
import rison from '@kbn/rison';
import url from 'url';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getTimepickerRisonData } from '../rison_helpers';

interface Props {
  dashboardId: string;
  editMode: boolean;
  children: React.ReactNode;
}

export const getKibanaDashboardHref = ({
  basePath,
  location,
  dashboardId,
  editMode,
}: {
  basePath: IBasePath;
  location: Location;
  dashboardId: Props['dashboardId'];
  editMode: Props['editMode'];
}) => {
  const risonQuery = {
    _g: getTimepickerRisonData(location.search),
  };

  const edit = editMode ? `&_a=(viewMode:edit)` : '';

  const dashboardPath = url.format({
    pathname: basePath.prepend('/app/dashboards'),
  });
  return `${dashboardPath}#/view/${dashboardId}/?_g=${rison.encode(
    risonQuery._g
  )}${edit}`;
};

export function KibanaDashboardLink({ dashboardId, editMode, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const href = getKibanaDashboardHref({
    basePath: core.http.basePath,
    dashboardId,
    location,
    editMode,
  });

  return (
    <EuiLink data-test-subj="apmKibanaDashboardLink" {...rest} href={href} />
  );
}
