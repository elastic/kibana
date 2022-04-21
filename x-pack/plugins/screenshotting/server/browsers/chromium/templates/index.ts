/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { resolve } from 'path';

export const getHeaderTemplate = (title: string) =>
  `<span style="font-size: 8px; color: #8d8e8e; font-family: system-ui; text-align: center; width: 100%;">${title}</span>`;

export const getFooterTemplate = () =>
  fs.readFileSync(resolve(__dirname, './footer.html')).toString();
