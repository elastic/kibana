/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The name of the exceptions list we give it when we save the saved object references. This name will
 * end up in the saved object as in this example:
 * {
 *   "references" : [
 *     {
 *       "name" : "param:exceptionsList_1",
 *       "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c",
 *       "type" : "exception-list"
 *     }
 *   ]
 * }
 */
export const EXCEPTIONS_SAVED_OBJECT_REFERENCE_NAME = 'exceptionsList';
