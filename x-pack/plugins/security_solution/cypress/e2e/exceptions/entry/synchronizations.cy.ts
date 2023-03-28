/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import {
  esArchiverLoad,
  esArchiverUnload,
  esArchiverResetKibana,
} from '../../../tasks/es_archiver';
describe('Add, copy comments in different exceptions type and validate sharing them between users', () => {
  describe('Rule exceptions', () => {
    before(() => {
      esArchiverResetKibana();
      esArchiverLoad('exceptions');
      login();
    });
    after(() => {
      esArchiverUnload('exceptions');
    });
  });
});
