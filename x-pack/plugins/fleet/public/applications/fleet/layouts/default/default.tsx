/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Section } from '../../sections';
import { useLink, useConfig } from '../../hooks';
import { WithHeaderLayout } from '../../../../layouts';

import { DefaultPageTitle } from './default_page_title';

interface Props {
  section?: Section;
  children?: React.ReactNode;
  rightColumn?: JSX.Element;
}

export const DefaultLayout: React.FunctionComponent<Props> = ({
  section,
  children,
  rightColumn,
}) => {
  const { getHref } = useLink();
  const { agents } = useConfig();

  return (
    <WithHeaderLayout
      leftColumn={<DefaultPageTitle />}
      rightColumn={rightColumn}
      tabs={[
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.agentsLinkText"
              defaultMessage="Agents"
            />
          ),
          isSelected: section === 'agents',
          href: getHref('agent_list'),
          disabled: !agents?.enabled,
          'data-test-subj': 'fleet-agents-tab',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.policiesLinkText"
              defaultMessage="Agent policies"
            />
          ),
          isSelected: section === 'agent_policies',
          href: getHref('policies_list'),
          'data-test-subj': 'fleet-agent-policies-tab',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.enrollmentTokensText"
              defaultMessage="Enrollment tokens"
            />
          ),
          isSelected: section === 'enrollment_tokens',
          href: getHref('enrollment_tokens'),
          'data-test-subj': 'fleet-enrollment-tokens-tab',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.dataStreamsLinkText"
              defaultMessage="Data streams"
            />
          ),
          isSelected: section === 'data_streams',
          href: getHref('data_streams'),
          'data-test-subj': 'fleet-datastreams-tab',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.appNavigation.settingsLinkText"
              defaultMessage="Settings"
            />
          ),
          isSelected: section === 'settings',
          href: getHref('settings'),
          'data-test-subj': 'fleet-settings-tab',
        },
      ]}
    >
      {children}
    </WithHeaderLayout>
  );
};
