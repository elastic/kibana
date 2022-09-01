/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { PrivateLocationsTable } from './locations_table';
import { PrivateLocation } from '../../../../../common/runtime_types';

export const PrivateLocationsList = ({
  privateLocations,
  onDelete,
}: {
  privateLocations: PrivateLocation[];
  onDelete: (id: string) => void;
}) => {
  return <PrivateLocationsTable privateLocations={privateLocations} onDelete={onDelete} />;
};

export const MONITORS = i18n.translate('xpack.synthetics.monitorManagement.monitors', {
  defaultMessage: 'Monitors',
});

export const AGENT_POLICY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agentPolicy', {
  defaultMessage: 'Agent Policy',
});
