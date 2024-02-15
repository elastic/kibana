/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import {
  MonitorScreenshotEmbeddable,
  MonitorScreenshotEmbeddableProps,
} from '@kbn/synthetics-plugin/public';
import { PluginContext } from '../../../../context/plugin_context';

export function MonitorSelector({
  onScreenshotCapture,
}: {
  onScreenshotCapture: MonitorScreenshotEmbeddableProps['onScreenshotCapture'];
}) {
  const { coreStart } = useContext(PluginContext);

  return (
    <>
      <MonitorScreenshotEmbeddable
        coreStart={coreStart}
        onScreenshotCapture={onScreenshotCapture}
      />
    </>
  );
}
