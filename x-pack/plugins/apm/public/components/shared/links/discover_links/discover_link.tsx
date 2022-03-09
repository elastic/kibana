/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { Location } from 'history';
import { IBasePath } from 'kibana/public';
import React from 'react';
import { useLocation } from 'react-router-dom';
import rison, { RisonValue } from 'rison-node';
import url from 'url';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../../common/index_pattern_constants';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getTimepickerRisonData } from '../rison_helpers';

interface Props {
  query: {
    _a?: {
      index?: string;
      interval?: string;
      query?: {
        language: string;
        query: string;
      };
      sort?: {
        [key: string]: string;
      };
    };
  };
  children: React.ReactNode;
}

export const getDiscoverHref = ({
  basePath,
  location,
  query,
}: {
  basePath: IBasePath;
  location: Location;
  query: Props['query'];
}) => {
  const risonQuery = {
    _g: getTimepickerRisonData(location.search),
    _a: {
      ...query._a,
      index: APM_STATIC_INDEX_PATTERN_ID,
    },
  };

  const href = url.format({
    pathname: basePath.prepend('/app/discover'),
    hash: `/?_g=${rison.encode(risonQuery._g)}&_a=${rison.encode(
      risonQuery._a as RisonValue
    )}`,
  });
  return href;
};

export function DiscoverLink({ query = {}, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const href = getDiscoverHref({
    basePath: core.http.basePath,
    query,
    location,
  });

  return <EuiLink {...rest} href={href} />;
}
