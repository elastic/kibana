/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallationType } from '../../common/installation';
import { LanguageServer } from '../../common/language_server';
import { GoLauncher } from './go_launcher';
import { JavaLauncher } from './java_launcher';
import { LauncherConstructor } from './language_server_launcher';
import { TypescriptServerLauncher } from './ts_launcher';

export interface LanguageServerDefinition extends LanguageServer {
  builtinWorkspaceFolders: boolean;
  launcher: LauncherConstructor;
  installationFolderName?: string;
  downloadUrl?: (lang: LanguageServerDefinition, version: string) => string | string;
  embedPath?: string;
  installationPluginName?: string;
}

export const TYPESCRIPT: LanguageServerDefinition = {
  name: 'Typescript',
  builtinWorkspaceFolders: false,
  languages: ['typescript', 'javascript', 'html'],
  launcher: TypescriptServerLauncher,
  installationType: InstallationType.Embed,
  embedPath: require.resolve('@elastic/javascript-typescript-langserver/lib/language-server.js'),
};
export const JAVA: LanguageServerDefinition = {
  name: 'Java',
  builtinWorkspaceFolders: true,
  languages: ['java'],
  launcher: JavaLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'java-langserver',
  installationFolderName: 'jdt',
  downloadUrl: (lang: LanguageServerDefinition, version: string) =>
    `https://download.elasticsearch.org/code/java-langserver/release/java-langserver-${version}-$OS.zip`,
};
export const GO: LanguageServerDefinition = {
  name: 'Go',
  builtinWorkspaceFolders: true,
  languages: ['go'],
  launcher: GoLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'goLanguageServer',
};
export const LanguageServers: LanguageServerDefinition[] = [TYPESCRIPT, JAVA];
export const LanguageServersDeveloping: LanguageServerDefinition[] = [GO];
