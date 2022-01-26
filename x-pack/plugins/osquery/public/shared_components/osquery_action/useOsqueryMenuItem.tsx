/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../common/lib/kibana';

export const ACTION_OSQUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.osqueryAlertTitle',
  {
    defaultMessage: 'Run Osquery',
  }
);

interface IProps {
  agentId: string;
  onClick: () => void;
}

export const useOsqueryMenuItem = ({ agentId, onClick }: IProps) => {
  const { http } = useKibana().services;
  const [isAvailable, setIsAvailable] = useState(false);
  useEffect(() => {
    (async () => {
      const result: { item: boolean } = await http.get(
        `/internal/osquery/fleet_wrapper/agents/${agentId}/available`
      );
      setIsAvailable(result.item);
    })();
  }, [agentId, http]);

  return (
    <EuiContextMenuItem
      key="osquery-action-item"
      data-test-subj="osquery-action-item"
      onClick={onClick}
      disabled={!isAvailable}
    >
      {ACTION_OSQUERY}
    </EuiContextMenuItem>
  );
};
