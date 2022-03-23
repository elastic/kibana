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

  if (language === 'dotnet') {
    return <ElasticsearchDotnet />;
  }

  if (language === 'go') {
    return <ElasticsearchGo cloudId={cloudId} />;
  }

  if (language === 'java') {
    return <ElasticsearchJava />;
  }

  if (language === 'javascript') {
    return <ElasticsearchJavascript cloudId={cloudId} />;
  }

  if (language === 'perl') {
    return <ElasticsearchPerl />;
  }

  if (language === 'php') {
    return <ElasticsearchPhp />;
  }

  if (language === 'python') {
    return <ElasticsearchPython cloudId={cloudId} />;
  }

  if (language === 'ruby') {
    return <ElasticsearchRuby cloudId={cloudId} />;
  }

  if (language === 'rust') {
    return <ElasticsearchRust />;
  }

  return null;
};
