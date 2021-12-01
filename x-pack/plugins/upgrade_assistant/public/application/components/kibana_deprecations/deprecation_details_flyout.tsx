/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';

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
  EuiSpacer,
} from '@elastic/eui';

import { uiMetricService, UIM_KIBANA_QUICK_RESOLVE_CLICK } from '../../lib/ui_metric';
import { DeprecationFlyoutLearnMoreLink, DeprecationBadge } from '../shared';
import type { DeprecationResolutionState, KibanaDeprecationDetails } from './kibana_deprecations';

import './_deprecation_details_flyout.scss';

export interface DeprecationDetailsFlyoutProps {
  deprecation: KibanaDeprecationDetails;
  closeFlyout: () => void;
  resolveDeprecation: (deprecationDetails: KibanaDeprecationDetails) => Promise<void>;
  deprecationResolutionState?: DeprecationResolutionState;
}

const i18nTexts = {
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
  quickResolveCalloutTitle: (
    <FormattedMessage
      id="xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveCalloutTitle"
      defaultMessage="Click {quickResolve} to fix this issue automatically."
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
  quickResolveErrorTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.quickResolveErrorTitle',
    {
      defaultMessage: 'Error resolving issue',
    }
  ),
  manualFixTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.flyout.manualFixTitle',
    {
      defaultMessage: 'How to fix',
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
  const isCurrent = deprecationResolutionState?.id === deprecation.id;
  const isResolved = isCurrent && deprecationResolutionState?.resolveDeprecationStatus === 'ok';

  const onResolveDeprecation = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_KIBANA_QUICK_RESOLVE_CLICK);
    resolveDeprecation(deprecation);
  }, [deprecation, resolveDeprecation]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge isCritical={deprecation.level === 'critical'} isResolved={isResolved} />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="kibanaDeprecationDetailsFlyoutTitle" className="eui-textBreakWord">
            {title}
          </h2>
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
          <p className="eui-textBreakWord">{message}</p>
          {documentationUrl && (
            <p>
              <DeprecationFlyoutLearnMoreLink documentationUrl={documentationUrl} />
            </p>
          )}
        </EuiText>

        <EuiSpacer />

        {/* Hide resolution steps if already resolved */}
        {!isResolved && (
          <div data-test-subj="resolveSection">
            {correctiveActions.api && (
              <>
                <EuiCallOut
                  title={i18nTexts.quickResolveCalloutTitle}
                  color="primary"
                  iconType="iInCircle"
                  data-test-subj="quickResolveCallout"
                />

                <EuiSpacer />
              </>
            )}

            {correctiveActions.manualSteps.length > 0 && (
              <>
                <EuiTitle size="s" data-test-subj="manualStepsTitle">
                  <h3>{i18nTexts.manualFixTitle}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText>
                  {correctiveActions.manualSteps.length === 1 ? (
                    <p data-test-subj="manualStep" className="eui-textBreakWord">
                      {correctiveActions.manualSteps[0]}
                    </p>
                  ) : (
                    <ol data-test-subj="manualStepsList">
                      {correctiveActions.manualSteps.map((step, stepIndex) => (
                        <li
                          data-test-subj="manualStepsListItem"
                          key={`step-${stepIndex}`}
                          className="upgResolveStep eui-textBreakWord"
                        >
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                </EuiText>
              </>
            )}
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

          {/* Only show the "Quick resolve" button if deprecation supports it and deprecation is not yet resolved */}
          {correctiveActions.api && !isResolved && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="resolveButton"
                onClick={onResolveDeprecation}
                isLoading={Boolean(
                  deprecationResolutionState?.resolveDeprecationStatus === 'in_progress'
                )}
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
