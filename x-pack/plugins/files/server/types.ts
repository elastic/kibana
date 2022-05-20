/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { FileServiceFactory } from './file_service';

export interface FilesPluginSetup {
  registerFileKind(arg: unknown): void;
}

export interface FilesPluginStart {
  fileServiceFactory: FileServiceFactory;
}

export interface FilesPluginSetupDependencies {
  security?: SecurityPluginSetup;
}
