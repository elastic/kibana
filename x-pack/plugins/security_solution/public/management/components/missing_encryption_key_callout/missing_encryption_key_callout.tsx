/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiCallOut, EuiSpacer, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useGetFleetStatus } from '../../hooks';

export const MissingEncryptionKeyCallout = memo(() => {
  const { data: fleetStatus } = useGetFleetStatus();
  const [calloutDismiss, setCalloutDismiss] = useState(false);

  if (!fleetStatus) {
    return null;
  }

  if (
    !calloutDismiss &&
    fleetStatus.missing_optional_features.includes('encrypted_saved_object_encryption_key_required')
  ) {
    return (
      <>
        <EuiCallOut
          color="warning"
          iconType="gear"
          data-test-subj="missingEncryptionKeyCallout"
          title={i18n.translate(
            'xpack.securitySolution.responder.missingEncryptionKey.callout.title',
            {
              defaultMessage: 'Encryption Key not set',
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.securitySolution.responder.missingEncryptionKey.callout.body"
              defaultMessage="The encryptionKey is not set in your kibana.yml config file and response actions might have unexpected behaviour"
            />
          </p>
          <EuiSpacer size="s" />
          <EuiButton
            onClick={() => setCalloutDismiss(true)}
            color="warning"
            data-test-subj="dismissEncryptionKeyCallout"
          >
            {'Dismiss'}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
});

MissingEncryptionKeyCallout.displayName = 'MissingEncryptionKeyCallout';
