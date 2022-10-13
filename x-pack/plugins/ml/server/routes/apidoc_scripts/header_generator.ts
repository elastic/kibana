/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';

const getHeaderString = () => `---
id: uiMlApi
slug: /ml-team/docs/ui/rest-api/ml-api
title: ML API reference
description: Reference documentation for the ML API.
date: ${moment().format('YYYY-MM-DD')}
tags: ['machine learning','internal docs', 'UI']
---`;

fs.writeFileSync(path.resolve(__dirname, '..', 'header.md'), getHeaderString());
