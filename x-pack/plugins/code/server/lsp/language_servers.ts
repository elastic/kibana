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
import { CtagsLauncher } from './ctags_launcher';

export interface LanguageServerDefinition extends LanguageServer {
  builtinWorkspaceFolders: boolean;
  launcher: LauncherConstructor;
  installationFolderName?: string;
  downloadUrl?: (version: string, devMode?: boolean) => string;
  embedPath?: string;
  installationPluginName?: string;
}

export const TYPESCRIPT: LanguageServerDefinition = {
  name: 'TypeScript',
  builtinWorkspaceFolders: false,
  languages: ['typescript', 'javascript'],
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
  downloadUrl: (version: string, devMode?: boolean) =>
    devMode!
      ? `https://snapshots.elastic.co/downloads/java-langserver-plugins/java-langserver/java-langserver-${version}-SNAPSHOT-$OS.zip`
      : `https://artifacts.elastic.co/downloads/java-langserver-plugins/java-langserver/java-langserver-${version}-$OS.zip`,
};
export const GO: LanguageServerDefinition = {
  name: 'Go',
  builtinWorkspaceFolders: true,
  languages: ['go'],
  launcher: GoLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'goLanguageServer',
};
export const CTAGS: LanguageServerDefinition = {
  name: 'ctags',
  builtinWorkspaceFolders: true,
  languages: [
    'ant',
    'asm',
    'asp',
    'basic',
    'beta',
    'c',
    'clojure',
    'c++',
    'c#',
    'cobol',
    'dosbatch',
    'eiffel',
    'erlang',
    'flex',
    'fortran',
    'haskell',
    'kotlin',
    'lisp',
    'lua',
    'make',
    'matlab',
    'ocaml',
    'pascal',
    'perl',
    'php',
    'powershell',
    'python',
    'rexx',
    'ruby',
    'rust',
    'scala',
    'scheme',
    'sh',
    'slang',
    'sml',
    'sql',
    'swift',
    'tcl',
    'tex',
    'vera',
    'verilog',
    'vhdl',
    'vim',
    'yacc',
  ],
  launcher: CtagsLauncher,
  installationType: InstallationType.Plugin,
  installationPluginName: 'ctagsLanguageServer',
};
export const LanguageServers: LanguageServerDefinition[] = [TYPESCRIPT, JAVA];
export const LanguageServersDeveloping: LanguageServerDefinition[] = [GO, CTAGS];
