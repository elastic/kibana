/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { DocLinksStart, MountPoint } from 'kibana/public';
import {
  EuiCheckbox,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

export const insecureClusterAlertTitle = i18n.translate(
  'xpack.security.checkup.insecureClusterTitle',
  { defaultMessage: 'Your data is not secure' }
);

export const insecureClusterAlertText = (
  getDocLinks: () => DocLinksStart,
  onDismiss: (persist: boolean) => void
) =>
  ((e) => {
    const AlertText = () => {
      const [persist, setPersist] = useState(false);
      const enableSecurityDocLink = `${
        getDocLinks().links.security.elasticsearchEnableSecurity
      }?blade=kibanasecuritymessage`;

      return (
        <I18nProvider>
          <div data-test-subj="insecureClusterAlertText">
            <EuiText size="s">
              <FormattedMessage
                id="xpack.security.checkup.insecureClusterMessage"
                defaultMessage="Don’t lose one bit. Enable our free security features."
              />
            </EuiText>
            <EuiSpacer />
            <EuiCheckbox
              id="persistDismissedAlertPreference"
              checked={persist}
              onChange={(changeEvent) => setPersist(changeEvent.target.checked)}
              label={i18n.translate('xpack.security.checkup.dontShowAgain', {
                defaultMessage: `Don't show again`,
              })}
            />
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="primary"
                  fill
                  href={enableSecurityDocLink}
                  target="_blank"
                  data-test-subj="learnMoreButton"
                >
                  {i18n.translate('xpack.security.checkup.enableButtonText', {
                    defaultMessage: `Enable security`,
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={() => onDismiss(persist)}
                  data-test-subj="dismissAlertButton"
                >
                  {i18n.translate('xpack.security.checkup.dismissButtonText', {
                    defaultMessage: `Dismiss`,
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </I18nProvider>
      );
    };

    render(<AlertText />, e);

    return () => unmountComponentAtNode(e);
  }) as MountPoint;
