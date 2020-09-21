/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import rison, { RisonValue } from 'rison-node';
import url from 'url';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { getTimepickerRisonData, TimepickerRisonData } from '../rison_helpers';

interface MlRisonData {
  ml?: {
    jobIds: string[];
  };
}

interface Props {
  query?: MlRisonData;
  path?: string;
  children?: React.ReactNode;
  external?: boolean;
}

export function MLLink({ children, path = '', query = {}, external }: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const risonQuery: MlRisonData & TimepickerRisonData = getTimepickerRisonData(
    location.search
  );

  if (query.ml) {
    risonQuery.ml = query.ml;
  }

  const href = url.format({
    pathname: core.http.basePath.prepend('/app/ml'),
    hash: `${path}?_g=${rison.encode(
      risonQuery as RisonValue
    )}&mlManagement=${rison.encode({ groupIds: ['apm'] })}`,
  });

  return (
    <EuiLink
      children={children}
      href={href}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
