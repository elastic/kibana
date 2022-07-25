/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  troubleshootLink: string;
}

export const ConfirmIncomingDataStandalone: React.FunctionComponent<Props> = ({
  troubleshootLink,
}) => {
  return (
    <>
      <EuiText>
        <EuiCallOut
          size="m"
          color="primary"
          title={
            <FormattedMessage
              id="xpack.fleet.confirmIncomingDataStandalone.title"
              defaultMessage="Data preview is not available for standalone agents. "
            />
          }
        >
          <FormattedMessage
            id="xpack.fleet.confirmIncomingDataStandalone.description"
            defaultMessage="You can check for agent data in the integration asset tab. If you're having trouble seeing data, check out the {link}."
            values={{
              link: (
                <EuiLink target="_blank" external href={troubleshootLink}>
                  <FormattedMessage
                    id="xpack.fleet.confirmIncomingDataStandalone.troubleshootingLink"
                    defaultMessage="troubleshooting guide"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      </EuiText>
    </>
  );
};
