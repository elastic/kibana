/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import React from 'react';

export function StreamDetailSchemaEditor({
  definition: _definition,
  refreshDefinition: _refreshDefinition,
}: {
  definition?: StreamDefinition;
  refreshDefinition: () => void;
}) {
  return (
    <>
      {i18n.translate('xpack.streams.streamDetailSchemaEditor.streamSchemaEditorLabel', {
        defaultMessage: 'Stream schema editor',
      })}
    </>
  );
}
