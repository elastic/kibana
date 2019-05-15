/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { RepositoryEdit } from '../../../public/app/sections/repository_edit';
import { WithProviders } from './providers';

export const setup = registerTestBed(WithProviders(RepositoryEdit));
