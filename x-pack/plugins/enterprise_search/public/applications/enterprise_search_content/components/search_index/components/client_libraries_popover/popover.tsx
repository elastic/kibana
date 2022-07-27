/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPopover,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../../shared/doc_links';

import { OverviewLogic } from '../../overview.logic';

const libraries = [
  {
    href: docLinks.clientsJavaIntroduction,
    key: 'java',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.java',
      { defaultMessage: 'Java' }
    ),
  },
  {
    href: docLinks.clientsJsIntro,
    key: 'javascript',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.javascript',
      { defaultMessage: 'Javascript / Node' }
    ),
  },
  {
    href: docLinks.clientsRubyOverview,
    key: 'ruby',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.ruby',
      { defaultMessage: 'Ruby' }
    ),
  },
  {
    href: docLinks.clientsGoIndex,
    key: 'go',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.go',
      { defaultMessage: 'Go' }
    ),
  },
  {
    href: docLinks.clientsNetIntroduction,
    key: 'dotnet',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.dotnet',
      { defaultMessage: '.NET' }
    ),
  },
  {
    href: docLinks.clientsPhpGuide,
    key: 'php',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.php',
      { defaultMessage: 'PHP' }
    ),
  },
  {
    href: docLinks.clientsPerlGuide,
    key: 'perl',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.perl',
      { defaultMessage: 'Perl' }
    ),
  },
  {
    href: docLinks.clientsPythonOverview,
    key: 'python',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.python',
      { defaultMessage: 'Python' }
    ),
  },
  {
    href: docLinks.clientsRustOverview,
    key: 'rust',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.rust',
      { defaultMessage: 'Rust' }
    ),
  },
];

export const ClientLibrariesPopover: React.FC = () => {
  const { isClientsPopoverOpen } = useValues(OverviewLogic);
  const { toggleClientsPopover } = useActions(OverviewLogic);

  return (
    <EuiPopover
      isOpen={isClientsPopoverOpen}
      closePopover={toggleClientsPopover}
      button={
        <EuiButton iconType="arrowDown" iconSide="right" onClick={toggleClientsPopover}>
          {i18n.translate(
            'xpack.enterpriseSearch.content,overview.documentExample.clientLibraries.label',
            { defaultMessage: 'Client Libraries' }
          )}
        </EuiButton>
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={libraries.map((item) => {
          return (
            <EuiContextMenuItem key={item.key} href={item.href} target="_blank">
              <EuiText>
                <p>{item.text}</p>
              </EuiText>
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );
};
