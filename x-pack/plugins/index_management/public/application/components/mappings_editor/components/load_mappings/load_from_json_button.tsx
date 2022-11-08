/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LoadMappingsProvider } from './load_mappings_provider';

interface Props {
  onJson(json: { [key: string]: any }): void;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
}

export const LoadMappingsFromJsonButton = ({ onJson, esNodesPlugins }: Props) => (
  <LoadMappingsProvider onJson={onJson} esNodesPlugins={esNodesPlugins}>
    {(openModal) => (
      <EuiButtonEmpty onClick={openModal} size="s">
        {i18n.translate('xpack.idxMgmt.mappingsEditor.loadFromJsonButtonLabel', {
          defaultMessage: 'Load JSON',
        })}
      </EuiButtonEmpty>
    )}
  </LoadMappingsProvider>
);
