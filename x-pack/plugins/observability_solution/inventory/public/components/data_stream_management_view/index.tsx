/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Entity } from '../../../common/entities';
import { DataStreamManagementView } from './physical_management';
import { LogicalManagementView } from './logical_management';

export function GeneralManagementView({
  entity,
  dataStreams,
}: {
  entity: Entity;
  dataStreams: Array<{ name: string }>;
}) {
  // if (entity.type === 'data_stream') {
  //   return <DataStreamManagementView entity={entity} />;
  // }
  return <LogicalManagementView entity={entity} dataStreams={dataStreams} />;
}
