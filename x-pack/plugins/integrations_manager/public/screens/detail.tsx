/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getIntegrationInfoByKey } from '../data';
import { IntegrationInfo } from '../../common/types';

interface MatchPackage {
  match: {
    params: {
      pkgkey: string;
    };
  };
}

export function Detail({ match }: MatchPackage) {
  const { pkgkey } = match.params;
  const [info, setInfo] = useState<IntegrationInfo | null>(null);

  useEffect(
    () => {
      getIntegrationInfoByKey(pkgkey).then(({ data }) => setInfo(data));
    },
    [pkgkey]
  );

  // don't have designs for loading/empty states
  if (!info) return null;
  const { description, name, version } = info;

  return (
    <EuiPanel>
      <EuiTitle>
        <h1>{`${name} (v${version})`}</h1>
      </EuiTitle>
      <EuiSpacer />
      <p>{description}</p>
    </EuiPanel>
  );
}
