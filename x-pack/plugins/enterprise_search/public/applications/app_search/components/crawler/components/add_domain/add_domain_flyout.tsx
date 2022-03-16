/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { AddDomainForm } from './add_domain_form';
import { AddDomainFormErrors } from './add_domain_form_errors';
import { AddDomainFormSubmitButton } from './add_domain_form_submit_button';

export const AddDomainFlyout: React.FC = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  return (
    <>
      <EuiButton
        size="s"
        color="success"
        iconType="plusInCircle"
        onClick={() => setIsFlyoutVisible(true)}
      >
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.addDomainFlyout.openButtonLabel',
          {
            defaultMessage: 'Add domain',
          }
        )}
      </EuiButton>

      {isFlyoutVisible && (
        <EuiPortal>
          <EuiFlyout onClose={() => setIsFlyoutVisible(false)}>
            <EuiFlyoutHeader>
              <EuiTitle size="m">
                <h2>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.addDomainFlyout.title',
                    {
                      defaultMessage: 'Add a new domain',
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody
              banner={
                <>
                  <EuiSpacer size="l" />
                  <AddDomainFormErrors />
                </>
              }
            >
              <EuiText>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.addDomainFlyout.description',
                  {
                    defaultMessage:
                      'You can add multiple domains to this engine\'s web crawler. Add another domain here and modify the entry points and crawl rules from the "Manage" page.',
                  }
                )}
                <p />
              </EuiText>
              <EuiSpacer size="l" />
              <AddDomainForm />
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={() => setIsFlyoutVisible(false)}>
                    {CANCEL_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AddDomainFormSubmitButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
};
