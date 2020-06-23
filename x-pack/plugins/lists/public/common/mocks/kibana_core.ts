/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../../../src/core/public/mocks';
import { CoreStart } from '../../../../../../src/core/public';

export type GlobalServices = Pick<CoreStart, 'http'>;

export const createKibanaCoreStartMock = (): GlobalServices => coreMock.createStart();
