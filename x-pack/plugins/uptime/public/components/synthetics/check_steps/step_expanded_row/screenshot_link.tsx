/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { JourneyStep } from '../../../../../common/runtime_types/ping/synthetics';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';

const LabelLink = euiStyled.div`
  margin-bottom: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

interface Props {
  lastSuccessfulStep: JourneyStep;
}

export const ScreenshotLink = ({ lastSuccessfulStep }: Props) => {
  return (
    <span>
      <FormattedMessage
        id="xpack.uptime.synthetics.executedStep.screenshot.successfulLink"
        defaultMessage="Screenshot from {link}"
        values={{
          link: (
            <ReactRouterEuiLink
              to={`/journey/${lastSuccessfulStep?.monitor?.check_group}/steps`}
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
