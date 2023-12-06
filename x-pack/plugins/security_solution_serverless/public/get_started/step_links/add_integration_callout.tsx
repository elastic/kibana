/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';

import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { useNavigateTo } from '@kbn/security-solution-navigation';

import { useAddIntegrationsCalloutStyles } from '../styles/add_integrations_callout.styles';
import { ADD_INTEGRATIONS_STEP } from './translations';
import { AddIntegrationsSteps } from '../types';

const AddIntegrationsCalloutComponent = ({ stepName }: { stepName?: string }) => {
  const { calloutWrapperStyles, calloutTitleStyles, calloutAnchorStyles } =
    useAddIntegrationsCalloutStyles();
  const { euiTheme } = useEuiTheme();
  const { navigateTo } = useNavigateTo();

  const toggleStep = useCallback(() => {
    navigateTo({
      deepLinkId: SecurityPageName.landing,
      path: `#${AddIntegrationsSteps.connectToDataSources}`,
    });
  }, [navigateTo]);

  return (
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
              defaultMessage="To {stepName} add integrations first {addIntegration}"
              values={{
                addIntegration: (
                  <EuiLink onClick={toggleStep} css={calloutAnchorStyles}>
                    {ADD_INTEGRATIONS_STEP}
                    <EuiIcon type="arrowRight" size="s" css={calloutAnchorStyles} />
                  </EuiLink>
                ),
                stepName: stepName ?? (
                  <FormattedMessage
                    id="xpack.securitySolutionServerless.getStarted.addIntegrationCallout.link.action"
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
  );
};

export const AddIntegrationCallout = React.memo(AddIntegrationsCalloutComponent);
