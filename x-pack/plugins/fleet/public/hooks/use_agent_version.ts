/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import semverRcompare from 'semver/functions/rcompare';
import semverLt from 'semver/functions/lt';

import { differsOnlyInPatch } from '../../common/services';

import { useKibanaVersion } from './use_kibana_version';
import { sendGetAgentsAvailableVersions } from './use_request';

/**
 * @returns The most compatible agent version available to install or upgrade to.
 */
export const useAgentVersion = (): string | undefined => {
  const kibanaVersion = useKibanaVersion();
  const [agentVersion, setAgentVersion] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getVersions = async () => {
      try {
        const res = await sendGetAgentsAvailableVersions();
        const availableVersions = res?.data?.items;
        let agentVersionToUse;

        availableVersions?.sort(semverRcompare);
        if (
          availableVersions &&
          availableVersions.length > 0 &&
          availableVersions.indexOf(kibanaVersion) !== 0
        ) {
          agentVersionToUse =
            availableVersions.find((version) => {
              return semverLt(version, kibanaVersion) || differsOnlyInPatch(version, kibanaVersion);
            }) || availableVersions[0];
        } else {
          agentVersionToUse = kibanaVersion;
        }

        setAgentVersion(agentVersionToUse);
      } catch (err) {
        setAgentVersion(kibanaVersion);
      }
    };

    getVersions();
  }, [kibanaVersion]);

  return agentVersion;
};
