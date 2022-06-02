/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const { executeSyntheticsRunner } = require('./base_e2e');
const path = require('path');

const e2eDir = path.join(__dirname, '../e2e');

executeSyntheticsRunner(e2eDir);
