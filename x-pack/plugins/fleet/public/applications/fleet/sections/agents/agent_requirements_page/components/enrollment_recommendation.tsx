/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../../../hooks';

import { agentFlyoutContext } from '../..';

export const EnrollmentRecommendation: React.FunctionComponent<{
  showStandaloneTab: () => void;
}> = ({ showStandaloneTab }) => {
  const flyoutContext = useContext(agentFlyoutContext);

  const { docLinks } = useStartServices();

  return (
    <>
      <EuiText>
        <strong>
          <FormattedMessage
            id="xpack.fleet.enrollment.fleetRecommendedTitle"
            defaultMessage="Enrolling your agents in Fleet is recommended."
          />
        </strong>

        <EuiSpacer size="m" />

        <ul>
          <li>
            <FormattedMessage
              id="xpack.fleet.enrollment.centrallyManageListItem"
              defaultMessage="Fleet provides an easy way to centrally manage your agents."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.enrollment.addIntegrationsListItem"
              defaultMessage="Allows you to remotely add integrations, track their health, upgrade agents, and execute actions."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.enrollment.requiredForSomeIntegrationsListItem"
              defaultMessage="Required for some integrations like Endpoint Security and OSQuery Manager."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.fleet.enrollment.learnMoreListItem"
              defaultMessage="To learn more, see the {userGuideLink}."
              values={{
                userGuideLink: (
                  <EuiLink href={docLinks.links.fleet.guide} target="_blank" external>
                    <FormattedMessage
                      id="xpack.fleet.enrollment.fleetUserGuideLink"
                      defaultMessage="Fleet User Guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          </li>
        </ul>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={flyoutContext?.openFleetServerFlyout}>
            <FormattedMessage
              id="xpack.fleet.enrollment.addFleetServerButton"
              defaultMessage="Add Fleet Server"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={showStandaloneTab}>
            <FormattedMessage
              id="xpack.fleet.enrollment.runStandaloneButton"
              defaultMessage="Run standalone"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
