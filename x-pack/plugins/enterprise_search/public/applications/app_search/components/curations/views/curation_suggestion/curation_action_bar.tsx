/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CurationActionsPopover } from './curation_actions_popover';
import { CurationSuggestionLogic } from './curation_suggestion_logic';

export const CurationActionBar: React.FC = () => {
  const { acceptSuggestion, rejectSuggestion } = useActions(CurationSuggestionLogic);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel color="subdued" paddingSize="s">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.title',
                    { defaultMessage: 'Manage suggestion' }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiButton
                    size="s"
                    color="danger"
                    iconType="crossInACircleFilled"
                    data-test-subj="rejectButton"
                    onClick={rejectSuggestion}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.rejectButtonLabel',
                      { defaultMessage: 'Reject' }
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    size="s"
                    color="success"
                    iconType="checkInCircleFilled"
                    data-test-subj="acceptButton"
                    onClick={acceptSuggestion}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.acceptButtonLabel',
                      { defaultMessage: 'Accept' }
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <CurationActionsPopover />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
