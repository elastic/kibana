/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Languages {
  JAVA = 'java',
  JAVASCRIPT = 'javascript',
  RUBY = 'ruby',
  GO = 'go',
  DOTNET = 'dotnet',
  PHP = 'php',
  PERL = 'perl',
  PYTHON = 'python',
  RUST = 'rust',
  CURL = 'curl',
}

export interface LanguageDefinitionSnippetArguments {
  url: string;
  apiKey: string;
  indexName?: string;
}

type CodeSnippet = string | ((args: LanguageDefinitionSnippetArguments) => string);
export interface LanguageDefinition {
  advancedConfig?: string;
  apiReference?: string;
  basicConfig?: string;
  configureClient: CodeSnippet;
  docLink: string;
  iconType: string;
  id: Languages;
  ingestData: CodeSnippet;
  ingestDataIndex: CodeSnippet;
  installClient: string;
  languageStyling?: string;
  name: string;
  buildSearchQuery: CodeSnippet;
  testConnection: CodeSnippet;
}
