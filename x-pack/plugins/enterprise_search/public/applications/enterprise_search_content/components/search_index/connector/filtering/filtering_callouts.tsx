/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringValidationState } from '../../../../../../../common/types/connectors';

interface FilteringStatusCalloutsProps {
  applyDraft: () => void;
  editDraft: () => void;
  state: FilteringValidationState;
}

export const FilteringStateCallouts: React.FC<FilteringStatusCalloutsProps> = ({
  applyDraft,
  editDraft,
  state,
}) => {
  switch (state) {
    case FilteringValidationState.EDITED:
      return (
        <EuiCallOut
          color="warning"
          title={
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.enterpriseSearch.index.connector.filtering.validatingTitle',
                  {
                    defaultMessage: 'Draft sync rules are validating',
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.filtering.validatingDescription',
                {
                  defaultMessage:
                    'Draft rules need to be validated before they can take effect. This may take a few minutes.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-filtering-validatingCallout-editRules"
                  onClick={editDraft}
                  color="warning"
                  fill
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.index.connector.filtering.validatingCallout.editDraftRulesTitle',
                    {
                      defaultMessage: 'Edit draft rules',
                    }
                  )}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    case FilteringValidationState.INVALID:
      return (
        <EuiCallOut
          color="danger"
          iconType="cross"
          title={i18n.translate('xpack.enterpriseSearch.index.connector.filtering.invalidTitle', {
            defaultMessage: 'Draft sync rules are invalid',
          })}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.filtering.invalidDescription',
                {
                  defaultMessage:
                    'Draft rules did not validate. Edit the draft rules before they can take effect.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-filtering-errorCallout-editRules"
                  onClick={editDraft}
                  color="danger"
                  fill
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.index.connector.filtering.errorCallout.editDraftRulesTitle',
                    {
                      defaultMessage: 'Edit draft rules',
                    }
                  )}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    case FilteringValidationState.VALID:
      return (
        <EuiCallOut
          color="success"
          iconType="check"
          title={i18n.translate('xpack.enterpriseSearch.index.connector.filtering.validatedTitle', {
            defaultMessage: 'Draft sync rules validated',
          })}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.filtering.validatedDescription',
                {
                  defaultMessage: 'Apply draft rules to take effect on the next sync.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexStart">
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButton
                      data-telemetry-id="entSearchContent-connector-filtering-successCallout-applyRules"
                      onClick={applyDraft}
                      color="success"
                      fill
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.index.connector.filtering.successCallout.applyDraftRulesTitle',
                        {
                          defaultMessage: 'Apply draft rules',
                        }
                      )}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButton
                      data-telemetry-id="entSearchContent-connector-filtering-successCallout-editRules"
                      onClick={editDraft}
                      color="success"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.index.connector.filtering.errorCallout.successEditDraftRulesTitle',
                        {
                          defaultMessage: 'Edit draft rules',
                        }
                      )}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    default:
      return <></>;
  }
};
