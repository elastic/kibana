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

import type { DeprecationResolutionState, KibanaDeprecationDetails } from './kibana_deprecations';

import './_deprecation_details_flyout.scss';

export interface DeprecationDetailsFlyoutProps {
  deprecation: KibanaDeprecationDetails;
  closeFlyout: () => void;
  resolveDeprecation: (deprecationDetails: KibanaDeprecationDetails) => Promise<void>;
  deprecationResolutionState?: DeprecationResolutionState;
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
  retryQuickResolveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.retryQuickResolveButtonLabel',
    {
      defaultMessage: 'Try again',
    }
  ),
  resolvedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.resolvedButtonLabel',
    {
      defaultMessage: 'Resolved',
    }
  ),
  quickResolveInProgressButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveInProgressButtonLabel',
    {
      defaultMessage: 'Resolution in progress…',
    }
  ),
  quickResolveCalloutTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveCalloutTitle',
    {
      defaultMessage: 'Quick resolve action available',
    }
  ),
  quickResolveErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveErrorTitle',
    {
      defaultMessage: 'Error resolving deprecation',
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

const getQuickResolveButtonLabel = (deprecationResolutionState?: DeprecationResolutionState) => {
  if (deprecationResolutionState?.resolveDeprecationStatus === 'in_progress') {
    return i18nTexts.quickResolveInProgressButtonLabel;
  }

  if (deprecationResolutionState?.resolveDeprecationStatus === 'ok') {
    return i18nTexts.resolvedButtonLabel;
  }

  if (deprecationResolutionState?.resolveDeprecationError) {
    return i18nTexts.retryQuickResolveButtonLabel;
  }

  return i18nTexts.quickResolveButtonLabel;
};

export const DeprecationDetailsFlyout = ({
  deprecation,
  closeFlyout,
  resolveDeprecation,
  deprecationResolutionState,
}: DeprecationDetailsFlyoutProps) => {
  const { documentationUrl, message, correctiveActions, title } = deprecation;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="kibanaDeprecationDetailsFlyoutTitle">{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {deprecationResolutionState?.resolveDeprecationStatus === 'fail' && (
          <>
            <EuiCallOut
              title={i18nTexts.quickResolveErrorTitle}
              color="danger"
              iconType="alert"
              data-test-subj="quickResolveError"
            >
              {deprecationResolutionState.resolveDeprecationError}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

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

        {/* Hide resolution steps if already resolved */}
        {deprecationResolutionState?.resolveDeprecationStatus !== 'ok' && (
          <div data-test-subj="resolveSection">
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
              <ol data-test-subj="manualStepsList">
                {correctiveActions.manualSteps.map((step, stepIndex) => (
                  <li key={`step-${stepIndex}`} className="upgResolveStep eui-textBreakWord">
                    {step}
                  </li>
                ))}
              </ol>
            </EuiText>
          </div>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          {/* Only show the "Quick resolve" button if deprecation supports it */}
          {correctiveActions.api && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="resolveButton"
                onClick={() => resolveDeprecation(deprecation)}
                isLoading={Boolean(
                  deprecationResolutionState?.resolveDeprecationStatus === 'in_progress'
                )}
                disabled={Boolean(deprecationResolutionState?.resolveDeprecationStatus === 'ok')}
              >
                {getQuickResolveButtonLabel(deprecationResolutionState)}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
