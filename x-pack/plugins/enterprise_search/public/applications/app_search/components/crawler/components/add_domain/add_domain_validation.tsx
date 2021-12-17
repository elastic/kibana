/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain_logic';
import { ValidationStepPanel } from './validation_step_panel';

export const AddDomainValidation: React.FC = () => {
  const {
    addDomainFormInputValue,
    canIgnoreValidationFailure,
    domainValidationResult,
    ignoreValidationFailure,
  } = useValues(AddDomainLogic);
  const { setIgnoreValidationFailure } = useActions(AddDomainLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.initialValidation}
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.initialVaidationLabel',
              {
                defaultMessage: 'Initial validation',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.networkConnectivity}
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.networkConnectivityLabel',
              {
                defaultMessage: 'Network connectivity',
              }
            )}
            action={
              <EuiButton size="s" href={addDomainFormInputValue} target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.testUrlButtonLabel',
                  {
                    defaultMessage: 'Test URL in the browser',
                  }
                )}
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.indexingRestrictions}
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.indexingRestrictionsLabel',
              {
                defaultMessage: 'Indexing restrictions',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ValidationStepPanel
            step={domainValidationResult.steps.contentVerification}
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.contentVerificationLabel',
              {
                defaultMessage: 'Content verification',
              }
            )}
          />
        </EuiFlexItem>
        {canIgnoreValidationFailure && (
          <EuiFlexItem>
            <EuiPanel hasShadow={false}>
              <EuiCheckbox
                id={`crawler_domain_${addDomainFormInputValue}`}
                label={
                  <>
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.ignoreValidationTitle',
                        {
                          defaultMessage: 'Ignore validation failures and continue',
                        }
                      )}
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiText color="subdued" size="xs">
                      {i18n.translate(
                        'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.ignoreValidationDescription',
                        {
                          defaultMessage:
                            'The web crawler will be unable to index any content on this domain until the errors above are addressed.',
                        }
                      )}
                    </EuiText>
                  </>
                }
                checked={ignoreValidationFailure}
                onChange={(e) => setIgnoreValidationFailure(e.target.checked)}
              />
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
