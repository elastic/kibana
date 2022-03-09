/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { Blockquote, ResetButton } from './helpers';

interface Props {
  isShowing: boolean;
  missingPatterns: string[];
  onDismissModal: () => void;
  onContinue: () => void;
  onUpdate: () => void;
}
const MyEuiModal = styled(EuiModal)`
  .euiModal__flex {
    width: 60vw;
  }
  .euiCodeBlock {
    height: auto !important;
    max-width: 718px;
  }
  z-index: 99999999;
`;

export const UpdateDefaultDataViewModal = React.memo<Props>(
  ({ isShowing, onDismissModal, onContinue, onUpdate, missingPatterns }) =>
    isShowing ? (
      <MyEuiModal onClose={onDismissModal} data-test-subj="sourcerer-update-data-view-modal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>{i18n.UPDATE_SECURITY_DATA_VIEW}</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s">
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.indexPatterns.missingPatterns"
                  defaultMessage="Security Data View is missing the following index patterns in order to recreate the previous timeline's data view: {callout}"
                  values={{
                    callout: <Blockquote>{missingPatterns.join(', ')}</Blockquote>,
                  }}
                />
                {i18n.UPDATE_DATA_VIEW}
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <ResetButton
                aria-label={i18n.CONTINUE_WITHOUT_ADDING}
                data-test-subj="sourcerer-continue-close"
                flush="left"
                onClick={onContinue}
                title={i18n.CONTINUE_WITHOUT_ADDING}
              >
                {i18n.CONTINUE_WITHOUT_ADDING}
              </ResetButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="sourcerer-update-data-view"
                fill
                fullWidth
                onClick={onUpdate}
                size="s"
              >
                {i18n.ADD_INDEX_PATTERN}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </MyEuiModal>
    ) : null
);

UpdateDefaultDataViewModal.displayName = 'UpdateDefaultDataViewModal';
