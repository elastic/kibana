/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon } from '@elastic/eui';

import { LinkAnchor } from '../../../../../../common/components/links';
import { CardCallOut } from '../../common/card_callout';
import { useNavigation } from '../../../../../../common/lib/kibana';
import { FLEET_APP_ID, ADD_AGENT_PATH } from '../constants';

const fleetAgentLinkProps = { appId: FLEET_APP_ID, path: ADD_AGENT_PATH };

export const AgentRequiredCallout = React.memo(() => {
  const { getAppUrl, navigateTo } = useNavigation();
  const addAgentLink = getAppUrl(fleetAgentLinkProps);
  const onAddAgentClick = useCallback(() => {
    navigateTo(fleetAgentLinkProps);
  }, [navigateTo]);

  return (
    <CardCallOut
      color="warning"
      text={
        <FormattedMessage
          id="xpack.securitySolution.onboarding.integrationsCard.callout.completeLabel"
          defaultMessage={`
      {desc} {link} {icon}
    `}
          values={{
            desc: (
              <FormattedMessage
                id="xpack.securitySolution.onboarding.integrationsCard.agent.text"
                defaultMessage="Elastic Agent is required for one or more of your integrations. Add Elastic Agent"
              />
            ),
            link: (
              <LinkAnchor href={addAgentLink} onClick={onAddAgentClick} data-test-subj="agentLink">
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.integrationsCard.agent.link"
                  defaultMessage="here"
                />
              </LinkAnchor>
            ),
            icon: <EuiIcon type="arrowRight" size="s" />,
          }}
        />
      }
    />
  );
});

AgentRequiredCallout.displayName = 'AgentRequiredCallout';
