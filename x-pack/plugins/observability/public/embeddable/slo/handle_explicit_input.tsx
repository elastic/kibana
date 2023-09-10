/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { CoreStart } from '@kbn/core/public';
import { ObservabilityPublicPluginsStart } from '../..';
import { SloConfiguration } from './slo_configuration';

export async function resolveEmbeddableSloUserInput(
  coreStart: CoreStart,
  pluginStart: ObservabilityPublicPluginsStart
) {
  const { overlays } = coreStart;
  return new Promise(async (resolve, reject) => {
    try {
      const modalSession = overlays.openModal(
        toMountPoint(<SloConfiguration />, { i18n: coreStart.i18n, theme: coreStart.theme })
      );
    } catch (error) {
      reject(error);
    }
  });
}
