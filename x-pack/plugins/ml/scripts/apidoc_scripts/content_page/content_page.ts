/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore can only be default-imported using the 'esModuleInterop' flag
import moment from 'moment';
import { kibanaPackageJson } from '@kbn/repo-info';
// eslint-disable-next-line import/no-extraneous-dependencies
import { createDoc } from 'apidoc-light';

interface Group {
  anchor: string;
  text: string;
}

const getContent = (groups: Group[]) => {
  const groupsStr = groups
    .map(({ anchor, text }) => `- <DocLink id="uiMlApi" section="${anchor}" text="${text} API" />`)
    .join('\n');

  return `---
id: uiMlKibanaRestApi
slug: /ml-team/docs/ui/rest-api/ml-kibana-rest-api
title: Machine Learning Kibana REST API
image: https://source.unsplash.com/400x175/?Nature
description: This page contains documentation for the ML Kibana REST API.
date: ${moment().format('YYYY-MM-DD')}
tags: ['machine learning','internal docs', 'UI']
---

_Updated for ${kibanaPackageJson.version}_

Some of the features of the Machine Learning (ML) Kibana plugin are provided via a REST API, which is ideal for creating an integration with the ML plugin.

Each API is experimental and can include breaking changes in any version of the ML plugin, or might have been entirely removed from the plugin.

- <DocLink id="uiMlApi" text="View complete API documentation" />

The following APIs are available:

${groupsStr}`;
};

export const generateContentPage = () => {
  const doc = createDoc({
    src: path.resolve(__dirname, '..', '..', '..', 'server', 'routes'),
    config: path.resolve(__dirname, '..', 'apidoc_config', 'apidoc.json'),
    // if you don't want to generate the output files:
    dryRun: true,
    // if you don't want to see any log output:
    silent: true,
  });

  const groups = [...new Set(doc.data.map((v) => v.group))].map((group) => {
    return {
      anchor: `-${group.toLowerCase()}`,
      text: group.replace(/([a-z])([A-Z])/g, '$1 $2'),
    };
  });

  fs.writeFileSync(path.resolve(__dirname, '..', 'ml_kibana_api.mdx'), getContent(groups));
};
