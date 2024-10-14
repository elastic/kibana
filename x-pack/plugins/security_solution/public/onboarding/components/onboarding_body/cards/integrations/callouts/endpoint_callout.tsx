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

import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { LinkAnchor } from '../../../../../../common/components/links';
import { CardCallOut } from '../../common/card_callout';

export const EndpointCallout = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const { docLinks } = useKibana().services;

  return (
    <CardCallOut
      color="danger"
      text={
        <FormattedMessage
          id="xpack.securitySolution.onboarding.integrationsCard.callout.endpointLabel"
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
                  id="xpack.securitySolution.onboarding.integrationsCard.callout.endpointNewLabel"
                  defaultMessage="NEW"
                />
              </b>
            ),
            text: (
              <FormattedMessage
                id="xpack.securitySolution.onboarding.integrationsCard.callout.endpointText"
                defaultMessage="Orchestrate response across endpoint vendors with bidirectional integrations"
              />
            ),
            link: (
              <LinkAnchor
                href={docLinks.links.securitySolution.responseActions}
                data-test-subj="endpointLearnMoreLink"
                external={true}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.integrationsCard.callout.button.endpointLearnMoreLink"
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

EndpointCallout.displayName = 'EndpointCallout';
