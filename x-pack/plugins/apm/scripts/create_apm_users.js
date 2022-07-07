/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This script will create two users
 * - editor
 * - viewer
 *
 * Usage: node create-apm-users.js
 ******************************/

// compile typescript on the fly
// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

require('./create_apm_users/create_apm_users_cli');
