/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorCodes } from 'vscode-jsonrpc/lib/messages';

export const ServerNotInitialized: number = ErrorCodes.ServerNotInitialized;
export const UnknownErrorCode: number = ErrorCodes.UnknownErrorCode;
export const UnknownFileLanguage: number = -42404;
export const LanguageServerNotInstalled: number = -42403;
export const LanguageDisabled: number = -42402;
export const LanguageServerStartFailed: number = -42405;
