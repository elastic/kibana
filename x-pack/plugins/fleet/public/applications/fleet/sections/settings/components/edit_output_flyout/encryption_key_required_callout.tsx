/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiCode } from '@elastic/eui';

import { useStartServices } from '../../../../hooks';

export const EncryptionKeyRequiredCallout: React.FunctionComponent = () => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut
      iconType="alert"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.encryptionKeyRequired.calloutTitle"
          defaultMessage="Set an encryption key to enable logstash output"
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.encryptionKeyRequired.calloutDescription"
        defaultMessage="To configure logstash output, set a value of {key} in your {file} file. {link}"
        values={{
          key: <EuiCode>xpack.encryptedSavedObjects.encryptionKey</EuiCode>,
          file: <EuiCode>kibana.yml</EuiCode>,
          link: (
            <EuiLink href={docLinks.links.kibana.secureSavedObject} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.encryptionKeyRequired.link"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
