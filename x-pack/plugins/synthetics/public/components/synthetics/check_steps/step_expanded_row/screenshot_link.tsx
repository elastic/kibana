/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { Ping } from '../../../../../common/runtime_types/ping/ping';

const LabelLink = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

interface Props {
  lastSuccessfulCheck: Ping;
}

export const ScreenshotLink = ({ lastSuccessfulCheck }: Props) => {
  return (
    <span>
      <FormattedMessage
        id="xpack.uptime.synthetics.executedStep.screenshot.successfulLink"
        defaultMessage="Screenshot from {link}"
        values={{
          link: (
            <ReactRouterEuiLink
              to={`/journey/${lastSuccessfulCheck?.monitor?.check_group}/steps`}
              className="eui-displayInlineBlock"
            >
              <LabelLink>
                <FormattedMessage
                  id="xpack.uptime.synthetics.executedStep.screenshot.success"
                  defaultMessage="last successful check"
                />
              </LabelLink>
            </ReactRouterEuiLink>
          ),
        }}
      />
    </span>
  );
};
