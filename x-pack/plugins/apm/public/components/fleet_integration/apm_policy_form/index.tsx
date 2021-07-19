/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { PackagePolicy } from '../../../../../fleet/common';
import {
  NewPackagePolicy,
  PackagePolicyCreateExtensionComponentProps,
} from '../../../../../fleet/public';
import {
  callApmApi,
  APIReturnType,
} from '../../../services/rest/createCallApmApi';

interface Props {
  policy?: PackagePolicy;
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyCreateExtensionComponentProps['onChange'];
}

type ApiResponse = APIReturnType<'GET /api/apm/fleet/package_info/inputs'>;
function fetchPackageInputs(name: string, version: string) {
  return callApmApi({
    endpoint: 'GET /api/apm/fleet/package_info/inputs',
    params: {
      query: {
        pkgName: name,
        pkgVersion: version,
      },
    },
    signal: null,
  });
}

export function APMPolicyForm({ policy, newPolicy }: Props) {
  const [inputs, setInputs] = useState<ApiResponse>();
  useEffect(() => {
    async function callFetchPackageInputs() {
      const { name, version } = newPolicy.package || {};
      if (name && version) {
        const response = await fetchPackageInputs(name, version);
        setInputs(response);
      }
    }
    callFetchPackageInputs();
  }, [newPolicy]);
  return <div>FORM</div>;
}
