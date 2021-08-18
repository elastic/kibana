/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import type { DomainDeprecationDetails } from 'kibana/public';

export interface DeprecationDetailsFlyoutProps {
  deprecation: DomainDeprecationDetails;
  closeFlyout: () => void;
}

const i18nTexts = {
  learnMoreLinkLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.learnMoreLinkLabel',
    {
      defaultMessage: 'Learn more about this deprecation',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  quickResolveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveButtonLabel',
    {
      defaultMessage: 'Quick resolve',
    }
  ),
  quickResolveCalloutTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveCalloutTitle',
    {
      defaultMessage: 'Quick resolve action available',
    }
  ),
  quickResolveCalloutDescription: (
    <FormattedMessage
      id="xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveCalloutDescription"
      defaultMessage="The steps to resolve this issue may be automated with {quickResolve} action below."
      values={{
        quickResolve: (
          <strong>
            {i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveText', {
              defaultMessage: 'Quick resolve',
            })}
          </strong>
        ),
      }}
    />
  ),
  manualFixTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.manualFixTitle',
    {
      defaultMessage: 'Fix manually',
    }
  ),
};

export const DeprecationDetailsFlyout = ({
  deprecation,
  closeFlyout,
}: DeprecationDetailsFlyoutProps) => {
  const { documentationUrl, message, correctiveActions } = deprecation;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2>Deprecation title goes here...</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>{message}</p>

          {documentationUrl && (
            <p>
              <EuiLink target="_blank" href={documentationUrl}>
                {i18nTexts.learnMoreLinkLabel}
              </EuiLink>
            </p>
          )}
        </EuiText>

        <EuiSpacer />

        {correctiveActions.api && (
          <>
            <EuiCallOut
              title={i18nTexts.quickResolveCalloutTitle}
              color="primary"
              iconType="iInCircle"
              data-test-subj="quickResolveCallout"
            >
              <p>{i18nTexts.quickResolveCalloutDescription}</p>
            </EuiCallOut>

            <EuiSpacer />
          </>
        )}

        <EuiTitle size="s">
          <h3>{i18nTexts.manualFixTitle}</h3>
        </EuiTitle>

        <EuiSpacer />

        <EuiText>
          <ol>
            {correctiveActions.manualSteps.map((step, stepIndex) => (
              // TODO temp inline style
              <li key={`step-${stepIndex}`} style={{ marginBottom: '15px' }}>
                {step}
              </li>
            ))}
          </ol>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          {/* Only show the Quick resolve button if deprecation supports it */}
          {correctiveActions.api && (
            <EuiFlexItem grow={false}>
              {/* TODO implement onClick */}
              <EuiButton fill onClick={() => {}}>
                {i18nTexts.quickResolveButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
