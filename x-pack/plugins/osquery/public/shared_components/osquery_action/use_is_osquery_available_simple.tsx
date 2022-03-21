/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { find } from 'lodash';
import { useKibana } from '../../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { AgentPolicy, FleetServerAgent, NewPackagePolicy } from '../../../../fleet/common';

interface IProps {
  agentId: string;
}

export const useIsOsqueryAvailableSimple = ({ agentId }: IProps) => {
  const { http } = useKibana().services;
  const [isAvailable, setIsAvailable] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { item: agentInfo }: { item: FleetServerAgent } = await http.get(
          `/internal/osquery/fleet_wrapper/agents/${agentId}`
        );
        const { item: packageInfo }: { item: AgentPolicy } = await http.get(
          `/internal/osquery/fleet_wrapper/agent_policies/${agentInfo.policy_id}/`
        );
        const osqueryPackageInstalled = find(packageInfo?.package_policies, [
          'package.name',
          OSQUERY_INTEGRATION_NAME,
        ]) as NewPackagePolicy;
        setIsAvailable(osqueryPackageInstalled.enabled);
      } catch (err) {
        return;
      }
    })();
  }, [agentId, http]);

  return isAvailable;
};