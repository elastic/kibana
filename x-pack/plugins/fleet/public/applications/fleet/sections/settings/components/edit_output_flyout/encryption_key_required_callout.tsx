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
          defaultMessage="Additional setup required"
        />
      }
    >
      <FormattedMessage
        id="xpack.fleet.encryptionKeyRequired.calloutDescription"
        defaultMessage="You must configure an encryption key before configuring this output. {link}"
        values={{
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
