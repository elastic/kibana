/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USERS_PATH } from '../../../common/constants';
import { UsersTableType } from '../store/model';

export const usersDetailsPagePath = `${USERS_PATH}/:detailName`;

export const usersTabPath = `${USERS_PATH}/:tabName(${UsersTableType.allUsers}|${UsersTableType.anomalies}|${UsersTableType.risk}|${UsersTableType.events}|${UsersTableType.alerts})`;

export const usersDetailsTabPath = `${usersDetailsPagePath}/:tabName(${UsersTableType.anomalies}|${UsersTableType.events}|${UsersTableType.alerts})`;
