"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const commands_1 = require("../../../shared/cypress/commands");
const routes_1 = require("../../../shared/cypress/routes");
const login = ({ path = '/', ...args } = {}) => {
    commands_1.login({ ...args });
    cy.visit(`${routes_1.appSearchPath}${path}`);
};
exports.login = login;
