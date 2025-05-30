/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CustomComponentProps } from '@kbn/home-plugin/public';
import { TutorialConfigAgent } from '.';

export function TutorialConfigAgentRumScript({
  http,
  basePath,
  isCloudEnabled,
  kibanaVersion,
}: Pick<CustomComponentProps, 'http' | 'basePath' | 'isCloudEnabled' | 'kibanaVersion'>) {
  return (
    <TutorialConfigAgent
      variantId="js_script"
      http={http}
      basePath={basePath}
      isCloudEnabled={isCloudEnabled}
      kibanaVersion={kibanaVersion}
    />
  );
}
