/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiIcon, useEuiTheme } from '@elastic/eui';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';

import { ExternalPageName } from '../../navigation/links/constants';
import { useAddIntegrationsCalloutStyles } from '../styles/add_integrations_callout.styles';
import { ADD_INTEGRATIONS } from './translations';

const AddIntegrationCalloutComponent = ({ stepName }: { stepName?: string }) => {
  const { calloutWrapperStyles, calloutTitleStyles } = useAddIntegrationsCalloutStyles();
  const { euiTheme } = useEuiTheme();

  return (
    <div>
      <EuiCallOut
        className="eui-displayInlineBlock"
        title={
          <>
            <EuiIcon
              size="m"
              type="iInCircle"
              color={euiTheme.colors.title}
              className="eui-alignMiddle"
            />
            <span css={calloutTitleStyles}>
              <FormattedMessage
                id="xpack.securitySolutionServerless.getStarted.addIntegrationCallout.description"
                defaultMessage="To {stepName} {addIntegration} first"
                values={{
                  addIntegration: (
                    <LinkAnchor id={ExternalPageName.integrationsSecurity}>
                      {ADD_INTEGRATIONS}
                    </LinkAnchor>
                  ),
                  stepName: stepName ?? (
                    <FormattedMessage
                      id="xpack.securitySolutionServerless.getStarted.addIntegration.link.action"
                      defaultMessage="enable this step"
                    />
                  ),
                }}
              />
            </span>
          </>
        }
        size="s"
        css={calloutWrapperStyles}
      />
    </div>
  );
};

export const AddIntegrationCallout = React.memo(AddIntegrationCalloutComponent);
