/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

import { useDismissableTour } from '../../../../hooks/use_dismissable_tour';
import type { Section } from '../../sections';
import { useLink, useConfig, useAuthz, useStartServices } from '../../hooks';
import { WithHeaderLayout } from '../../../../layouts';

import { ExperimentalFeaturesService } from '../../services';

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
  const authz = useAuthz();
  const { agentTamperProtectionEnabled, subfeaturePrivileges } = ExperimentalFeaturesService.get();

  const { docLinks } = useStartServices();
  const granularPrivilegesCallout = useDismissableTour('GRANULAR_PRIVILEGES');

  const tabs = [
    {
      name: (
        <FormattedMessage id="xpack.fleet.appNavigation.agentsLinkText" defaultMessage="Agents" />
      ),
      isSelected: section === 'agents',
      href: getHref('agent_list'),
      disabled: !agents?.enabled,
      'data-test-subj': 'fleet-agents-tab',
      isHidden: !authz.fleet.readAgents,
    },

    {
      name: (
        <FormattedMessage
          id="xpack.fleet.appNavigation.policiesLinkText"
          defaultMessage="Agent policies"
        />
      ),
      isHidden: !authz.fleet.readAgentPolicies,
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
      isHidden: !authz.fleet.allAgents,
      isSelected: section === 'enrollment_tokens',
      href: getHref('enrollment_tokens'),
      'data-test-subj': 'fleet-enrollment-tokens-tab',
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.appNavigation.uninstallTokensText"
          defaultMessage="Uninstall tokens"
        />
      ),
      isSelected: section === 'uninstall_tokens',
      href: getHref('uninstall_tokens'),
      'data-test-subj': 'fleet-uninstall-tokens-tab',
      isHidden: !authz.fleet.allAgents || !agentTamperProtectionEnabled, // needed only for agentTamperProtectionEnabled feature flag
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
      isHidden: !authz.fleet.readSettings,
      isSelected: section === 'settings',
      href: getHref('settings'),
      'data-test-subj': 'fleet-settings-tab',
    },
  ]
    // Removed hidden tabs
    .filter(({ isHidden }) => !isHidden)
    .map(({ isHidden, ...tab }) => tab);

  return (
    <>
      {!subfeaturePrivileges || !authz.fleet.all || granularPrivilegesCallout.isHidden ? null : (
        <EuiCallOut
          size="s"
          iconType="cheer"
          onDismiss={granularPrivilegesCallout.dismiss}
          title={
            <>
              <FormattedMessage
                id="xpack.fleet.granularPrivileges.callOutContent"
                defaultMessage="We've added new privileges that let you define more granularly who can view or edit Fleet agents, policies, and settings. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={docLinks.links.fleet.roleAndPrivileges} external>
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.granularPrivileges.learnMoreLinkText"
                          defaultMessage="Learn more."
                        />
                      </strong>
                    </EuiLink>
                  ),
                }}
              />
            </>
          }
        />
      )}
      <WithHeaderLayout leftColumn={<DefaultPageTitle />} rightColumn={rightColumn} tabs={tabs}>
        {children}
      </WithHeaderLayout>
    </>
  );
};
