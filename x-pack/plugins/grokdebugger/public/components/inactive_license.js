/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiText,
  EuiLink,
  EuiCode,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const InactiveLicenseSlate = () => {
  const registerLicenseLinkLabel = i18n.translate('xpack.grokDebugger.registerLicenseLinkLabel', {
    defaultMessage: 'register a license',
  });

  const trialLicense = i18n.translate('xpack.grokDebugger.trialLicenseTitle', {
    defaultMessage: 'Trial',
  });

  const basicLicense = i18n.translate('xpack.grokDebugger.basicLicenseTitle', {
    defaultMessage: 'Basic',
  });

  const goldLicense = i18n.translate('xpack.grokDebugger.goldLicenseTitle', {
    defaultMessage: 'Gold',
  });

  const platinumLicense = i18n.translate('xpack.grokDebugger.platinumLicenseTitle', {
    defaultMessage: 'Platinum',
  });

  return (
    <EuiPage>
      <EuiPageBody component="div">
        <EuiPageContent verticalPosition="center" horizontalPosition="center">
          <EuiPageContentBody>
            <EuiCallOut
              title={i18n.translate('xpack.grokDebugger.licenseErrorMessageTitle', {
                defaultMessage: 'License error',
              })}
              color="danger"
              iconType="alert"
              style={{ padding: '16px' }}
            >
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.grokDebugger.licenseErrorMessageDescription"
                    defaultMessage="The Grok Debugger requires an active license ({licenseTypeList} or {platinumLicenseType}), but none were found in your cluster."
                    values={{
                      licenseTypeList: (
                        <>
                          <EuiCode>{trialLicense}</EuiCode>, <EuiCode>{basicLicense}</EuiCode>,{' '}
                          <EuiCode>{goldLicense}</EuiCode>
                        </>
                      ),
                      platinumLicenseType: <EuiCode>{platinumLicense}</EuiCode>,
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.grokDebugger.registerLicenseDescription"
                    defaultMessage="Please {registerLicenseLink} to continue using the Grok Debugger"
                    values={{
                      registerLicenseLink: (
                        <EuiLink href="https://www.elastic.co/subscriptions" rel="noopener">
                          {registerLicenseLinkLabel}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiCallOut>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
