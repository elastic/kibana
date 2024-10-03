/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { LinkAnchor } from '../../../../../common/components/links';
import { CardCallOut } from '../common/card_callout';
import { AGENTLESS_LEARN_MORE_LINK } from './const';

export const AgentlessAvailableCallout = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  if (!AGENTLESS_LEARN_MORE_LINK) {
    return null;
  }

  return (
    <CardCallOut
      color="danger"
      text={
        <FormattedMessage
          id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableLabel"
          defaultMessage={`{icon} {new} {text} {link}`}
          values={{
            icon: <EuiIcon type="cheer" size="m" />,
            new: (
              <b
                css={css`
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableNewLabel"
                  defaultMessage="NEW"
                />
              </b>
            ),
            text: (
              <FormattedMessage
                id="xpack.securitySolution.onboarding.integrationsCard.callout.agentLessAvailableText"
                defaultMessage="Identify configuration risks in your cloud account with new and simplified agentless configuration"
              />
            ),
            link: (
              <LinkAnchor
                href={AGENTLESS_LEARN_MORE_LINK}
                data-test-subj="agentlessLearnMoreLink"
                external={true}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.integrationsCard.button.agentlessLearnMoreLink"
                  defaultMessage="Learn more"
                />
              </LinkAnchor>
            ),
          }}
        />
      }
    />
  );
});

AgentlessAvailableCallout.displayName = 'AgentlessAvailableCallout';
