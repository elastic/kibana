/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This script will create two roles
 * - a read_only kibana role
 * - a read/write kibana role
 *
 * The two roles will be assigned to the already existing users: `apm_read_user`, `apm_write_user`, `kibana_write_user`
 *
 * This makes it possible to use the existing cloud users locally
 * Usage: node create-apm-users-and-roles.js --role-suffix <YOUR-GITHUB-USERNAME-OR-SOMETHING-UNIQUE>
 ******************************/

// compile typescript on the fly
// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

require('./create_apm_users_and_roles/create_apm_users_and_roles_cli.ts');
