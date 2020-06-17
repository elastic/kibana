/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { Immutable } from '../../../../../common/endpoint/types';
import { GetPackagesResponse } from '../../../../../../ingest_manager/common/types/rest_spec';
import { sendGetEndpointSecurityPackage } from '../store/policy_list/services/ingest';
import { useKibana } from '../../../../common/lib/kibana';

type UseEndpointPackageInfo = [
  /** The Package Info. will be undefined while it is being fetched */
  Immutable<GetPackagesResponse['response'][0]> | undefined,
  /** Boolean indicating if fetching is underway */
  boolean,
  /** Any error encountered during fetch */
  Error | undefined
];

/**
 * Hook that fetches the endpoint package info
 *
 * @example
 * const [packageInfo, isFetching, fetchError] = useEndpointPackageInfo();
 */
export const useEndpointPackageInfo = (): UseEndpointPackageInfo => {
  const {
    services: { http },
  } = useKibana();
  const [endpointPackage, setEndpointPackage] = useState<UseEndpointPackageInfo[0]>();
  const [isFetching, setIsFetching] = useState<UseEndpointPackageInfo[1]>(true);
  const [error, setError] = useState<UseEndpointPackageInfo[2]>();

  useEffect(() => {
    sendGetEndpointSecurityPackage(http)
      .then((packageInfo) => setEndpointPackage(packageInfo))
      .catch((apiError) => setError(apiError))
      .finally(() => setIsFetching(false));
  }, [http]);

  return [endpointPackage, isFetching, error];
};
