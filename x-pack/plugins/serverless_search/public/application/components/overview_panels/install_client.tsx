/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CodeBox } from '../code_box';
import { languageDefinitions } from '../languages/languages';
import { OverviewPanel } from './overview_panel';
import {
  LanguageDefinition,
  Languages,
  LanguageDefinitionSnippetArguments,
} from '../languages/types';
import { GithubLink } from '../shared/github_link';

interface InstallClientProps {
  codeArguments: LanguageDefinitionSnippetArguments;
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
}

const Link: React.FC<{ language: Languages }> = ({ language }) => {
  switch (language) {
    case Languages.CURL:
      return (
        <GithubLink
          href="https://github.com/curl/curl"
          label={i18n.translate('xpack.serverlessSearch.githubLink.curl.label', {
            defaultMessage: 'curl',
          })}
        />
      );
    case Languages.JAVASCRIPT:
      return (
        <GithubLink
          href="https://github.com/elastic/elasticsearch-js"
          label={i18n.translate('xpack.serverlessSearch.githubLink.javascript.label', {
            defaultMessage: 'elasticsearch',
          })}
        />
      );
    case Languages.RUBY:
      return (
        <GithubLink
          href="https://github.com/elastic/elasticsearch-ruby"
          label={i18n.translate('xpack.serverlessSearch.githubLink.ruby.label', {
            defaultMessage: 'elasticsearch-ruby',
          })}
        />
      );
  }
  return null;
};

export const InstallClientPanel: React.FC<InstallClientProps> = ({
  codeArguments,
  language,
  setSelectedLanguage,
}) => {
  return (
    <OverviewPanel
      description={i18n.translate('xpack.serverlessSearch.installClient.description', {
        defaultMessage:
          'Elastic builds and maintains clients in several popular languages and our community has contributed many more. Install your favorite language client to get started.',
      })}
      links={[
        {
          href: language.docLink,
          label: i18n.translate('xpack.serverlessSearch.installClient.clientDocLink', {
            defaultMessage: '{languageName} client documentation',
            values: { languageName: language.name },
          }),
        },
      ]}
      title={i18n.translate('xpack.serverlessSearch.installClient.title', {
        defaultMessage: 'Install a client',
      })}
      leftPanelContent={
        <>
          <CodeBox
            code="installClient"
            codeArgs={codeArguments}
            languageType="shell"
            languages={languageDefinitions}
            selectedLanguage={language}
            setSelectedLanguage={setSelectedLanguage}
          />
          <EuiSpacer />
          <Link language={language.id} />
          <EuiSpacer />
          <EuiCallOut
            iconType="iInCircle"
            title={i18n.translate('xpack.serverlessSearch.apiCallOut.title', {
              defaultMessage: 'Call the API with Console',
            })}
            color="primary"
          >
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.apiCallout.content', {
                defaultMessage:
                  'Console enables you to call Elasticsearch and Kibana REST APIs directly, without needing to install a language client.',
              })}
            </EuiText>
          </EuiCallOut>
        </>
      }
    />
  );
};
