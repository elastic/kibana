"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../support/commands");
context('Engines', () => {
    beforeEach(() => {
        commands_1.login();
    });
    it('renders', () => {
        cy.contains('Engines');
    });
});
