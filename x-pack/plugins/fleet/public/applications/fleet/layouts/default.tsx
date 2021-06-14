/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPortal,
  EuiText,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import type { Section } from '../sections';
import { SettingFlyout } from '../components';
import { useLink, useConfig, useUrlModal } from '../hooks';
import { WithHeaderLayout } from '../../../layouts';

interface Props {
  showSettings?: boolean;
  section?: Section;
  children?: React.ReactNode;
}

export const DefaultLayout: React.FunctionComponent<Props> = ({
  section,
  children,
  showSettings = true,
}) => {
  const { getHref } = useLink();
  const { agents } = useConfig();
  const { modal, setModal } = useUrlModal();

  return (
    <>
      {modal === 'settings' && (
        <EuiPortal>
          <SettingFlyout
            onClose={() => {
              setModal(null);
            }}
          />
        </EuiPortal>
      )}

      <WithHeaderLayout
        leftColumn={
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="l">
                    <h1>
                      <FormattedMessage id="xpack.fleet.overviewPageTitle" defaultMessage="Fleet" />
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label={i18n.translate('xpack.fleet.betaBadge.labelText', {
                      defaultMessage: 'Beta',
                    })}
                    tooltipContent={i18n.translate('xpack.fleet.betaBadge.tooltipText', {
                      defaultMessage:
                        'This plugin is not recommended for production environments. Please report bugs in our Discuss forum.',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.overviewPageSubtitle"
                    defaultMessage="Centralized management for Elastic Agents"
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
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
          },
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.appNavigation.policiesLinkText"
                defaultMessage="Agent Policies"
              />
            ),
            isSelected: section === 'agent_policies',
            href: getHref('policies_list'),
          },
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.appNavigation.enrollmentTokensText"
                defaultMessage="Enrollment Tokens"
              />
            ),
            isSelected: section === 'enrollment_tokens',
            href: getHref('enrollment_tokens'),
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
          },
        ]}
      >
        {children}
      </WithHeaderLayout>
    </>
  );
};
