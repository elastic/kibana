/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';

interface SemanticTextBannerProps {
  isSemanticTextEnabled: boolean;
}

export function SemanticTextBanner({ isSemanticTextEnabled }: SemanticTextBannerProps) {
  const [isSemanticTextBannerDisplayable, setIsSemanticTextBannerDisplayable] =
    useState<boolean>(true);
  return isSemanticTextBannerDisplayable && isSemanticTextEnabled ? (
    <>
      <EuiPanel color="success" data-test-subj="indexDetailsMappingsSemanticTextBanner">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="m" color="success">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.description"
                defaultMessage="{label} Add a field to your mapping and choose 'semantic_text' to get started.'"
                values={{
                  label: (
                    <strong>
                      <FormattedMessage
                        id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.semanticTextFieldAvailable"
                        defaultMessage="semantic_text field type now available!"
                      />
                    </strong>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setIsSemanticTextBannerDisplayable(false)}
              data-test-subj="SemanticTextBannerDismissButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.semanticTextBanner.dismiss"
                defaultMessage="Dismiss"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  ) : null;
}
