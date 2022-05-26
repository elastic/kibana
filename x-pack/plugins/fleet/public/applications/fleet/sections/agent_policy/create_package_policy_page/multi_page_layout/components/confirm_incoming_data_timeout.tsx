/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  troubleshootLink: string;
}

export const ConfirmIncomingDataTimeout: React.FunctionComponent<Props> = ({
  troubleshootLink,
}) => {
  return (
    <>
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.fleet.confirmIncomingData.timeout.title"
            defaultMessage="Confirming data is taking longer than expected"
          />
        </h3>
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.confirmIncomingData.timeout.body"
          defaultMessage="If the system is not generating data, it may help to generate some to ensure data is being collected correctly. If you're having trouble, see our {troubleshootLink}."
          values={{
            troubleshootLink: (
              <EuiLink external href={troubleshootLink} target="_blank">
                <FormattedMessage
                  id="xpack.fleet.confirmIncomingData.timeout.troubleshootLink"
                  defaultMessage="troubleshooting guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
