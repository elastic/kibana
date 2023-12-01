/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiIcon, useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';

import { css } from '@emotion/react';
import { ExternalPageName } from '../../navigation/links/constants';

const AddIntegrationCalloutComponent = ({ stepName }: { stepName?: string }) => {
  const { euiTheme } = useEuiTheme();
  const backgroundColor = useEuiBackgroundColor('primary');

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
            <span
              css={css`
                color: ${euiTheme.colors.title};
                font-size: ${euiTheme.size.m};
                font-weight: ${euiTheme.font.weight.regular};
                line-height: ${euiTheme.base * 1.25}px;
                margin-left: ${euiTheme.size.xs};
              `}
            >
              <FormattedMessage
                id="xpack.securitySolutionServerless.getStarted.viewDashboard.addIntegrationCallout.description"
                defaultMessage="To {stepName} {addIntegration} First"
                values={{
                  addIntegration: (
                    <LinkAnchor id={ExternalPageName.integrationsSecurity}>
                      <FormattedMessage
                        id="xpack.securitySolutionServerless.getStarted.addIntegration.link.title"
                        defaultMessage="Add integrations"
                      />
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
        css={css`
          border-radius: ${euiTheme.border.radius.medium};
          border: 1px solid ${euiTheme.colors.lightShade};
          padding: ${euiTheme.size.xs} ${euiTheme.size.m};
          background-color: ${backgroundColor};
          margin-top: ${euiTheme.size.base};
        `}
      />
    </div>
  );
};

export const AddIntegrationCallout = React.memo(AddIntegrationCalloutComponent);
