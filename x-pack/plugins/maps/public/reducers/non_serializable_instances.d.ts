/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Adapters } from 'src/plugins/inspector/public';
import { AnyAction } from 'redux';

export function setEventHandlers(handlers: unknown): AnyAction;

export function getInspectorAdapters(args: unknown): Adapters | undefined;
