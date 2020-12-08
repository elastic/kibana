/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APMQueryParams } from '../url_helpers';
import { APMLink, APMLinkExtendProps, useAPMHref } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = ['host', 'agentName'];

export function useServiceInventoryHref() {
  return useAPMHref('/services', persistedFilters);
}

export function ServiceInventoryLink(props: APMLinkExtendProps) {
  const { urlParams } = useUrlParams();

  const query = pickKeys(urlParams as APMQueryParams, ...persistedFilters);

  return <APMLink path="/services" query={query} {...props} />;
}
