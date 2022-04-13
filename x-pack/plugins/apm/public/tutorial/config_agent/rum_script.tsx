/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpStart } from 'kibana/public';
import React from 'react';
import TutorialConfigAgent from './';

interface Props {
  http: HttpStart;
  basePath: string;
  isCloudEnabled: boolean;
  kibanaVersion: string;
}

function TutorialConfigAgentRumScript({
  http,
  basePath,
  isCloudEnabled,
  kibanaVersion,
}: Props) {
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

// eslint-disable-next-line import/no-default-export
export default TutorialConfigAgentRumScript;
