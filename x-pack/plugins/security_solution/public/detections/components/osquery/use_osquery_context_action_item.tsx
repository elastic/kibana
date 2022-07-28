/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { OsqueryActionItem } from './osquery_action_item';
import { useKibana } from '../../../common/lib/kibana';

interface IProps {
  handleClick: () => void;
  agentId?: string;
}

export const useOsqueryContextActionItem = ({ handleClick, agentId }: IProps) => {
  const osqueryActionItem = useMemo(
    () => <OsqueryActionItem handleClick={handleClick} />,
    [handleClick]
  );
  const {
    osquery,
    application: {
      capabilities: { osquery: permissions },
    },
  } = useKibana().services;
  const osqueryAvailable = osquery?.isOsqueryAvailable({
    agentId: agentId ?? '',
  });
  const hasPermissions = permissions?.writeLiveQueries || permissions?.runSavedQueries;

  return {
    osqueryActionItems: osqueryAvailable && hasPermissions ? [osqueryActionItem] : [],
  };
};
