/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';

import { ElasticsearchDotnet } from './elasticsearch_dotnet';
import { ElasticsearchGo } from './elasticsearch_go';
import { ElasticsearchJava } from './elasticsearch_java';
import { ElasticsearchJavascript } from './elasticsearch_javascript';
import { ElasticsearchPerl } from './elasticsearch_perl';
import { ElasticsearchPhp } from './elasticsearch_php';
import { ElasticsearchPython } from './elasticsearch_python';
import { ElasticsearchRuby } from './elasticsearch_ruby';
import { ElasticsearchRust } from './elasticsearch_rust';

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
    case 'perl':
      return <ElasticsearchPerl />;
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
