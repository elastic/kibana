/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';
import { WiredStreamDetailManagement } from './wired';
import { ClassicStreamDetailManagement } from './classic';

export function StreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  if (!definition) {
    return null;
  }

  if (definition.managed) {
    return (
      <WiredStreamDetailManagement definition={definition} refreshDefinition={refreshDefinition} />
    );
  }

  return (
    <ClassicStreamDetailManagement definition={definition} refreshDefinition={refreshDefinition} />
  );
}
