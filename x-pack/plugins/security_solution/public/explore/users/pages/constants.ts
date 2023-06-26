/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USERS_PATH } from '../../../../common/constants';

export const usersDetailsPagePath = `${USERS_PATH}/name/:detailName`;

export const usersTabPath = `${USERS_PATH}/:tabName`;

export const usersDetailsTabPath = `${usersDetailsPagePath}/:tabName`;
