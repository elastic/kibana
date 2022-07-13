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

import { OverviewLogic } from '../../overview.logic';

const libraries = [
  {
    key: 'java',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.java',
      { defaultMessage: 'Java' }
    ),
  },
  {
    key: 'javascript',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.javascript',
      { defaultMessage: 'Javascript / Node' }
    ),
  },
  {
    key: 'ruby',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.ruby',
      { defaultMessage: 'Ruby' }
    ),
  },
  {
    key: 'go',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.go',
      { defaultMessage: 'Go' }
    ),
  },
  {
    key: 'dotnet',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.dotnet',
      { defaultMessage: '.NET' }
    ),
  },
  {
    key: 'php',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.php',
      { defaultMessage: 'PHP' }
    ),
  },
  {
    key: 'perl',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.perl',
      { defaultMessage: 'Perl' }
    ),
  },
  {
    key: 'python',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.python',
      { defaultMessage: 'Python' }
    ),
  },
  {
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
            <EuiContextMenuItem key={item.key}>
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
