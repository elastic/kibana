/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';

import {
  ElasticsearchDotnet,
  ElasticsearchGo,
  ElasticsearchJava,
  ElasticsearchJavascript,
  ElasticsearchPhp,
  ElasticsearchPython,
  ElasticsearchRuby,
  ElasticsearchRust,
} from './languages';

const useCloudId = (): string | undefined => {
  const { cloud } = useValues(KibanaLogic);
  return cloud?.cloudId;
};

export const ElasticsearchClientInstructions: React.FC<{ language: string }> = ({ language }) => {
  const cloudId = useCloudId();

  switch (language) {
    case 'dotnet':
      return <ElasticsearchDotnet />;
    case 'go':
      return <ElasticsearchGo cloudId={cloudId} />;
    case 'java':
      return <ElasticsearchJava />;
    case 'javascript':
      return <ElasticsearchJavascript cloudId={cloudId} />;
    case 'php':
      return <ElasticsearchPhp cloudId={cloudId} />;
    case 'python':
      return <ElasticsearchPython cloudId={cloudId} />;
    case 'ruby':
      return <ElasticsearchRuby cloudId={cloudId} />;
    case 'rust':
      return <ElasticsearchRust />;
    default:
      return null;
  }
};
