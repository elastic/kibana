/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiText,
  EuiSteps,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export interface StepsModalContent {
  domainId: string;
  steps: string[];
  documentationUrl?: string;
}

interface Props {
  closeModal: () => void;
  modalContent: StepsModalContent;
}

const i18nTexts = {
  getModalTitle: (domainId: string) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.stepsModal.modalTitle', {
      defaultMessage: "Resolve deprecation in '{domainId}'",
      values: {
        domainId,
      },
    }),
  getStepTitle: (step: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.stepsModal.stepTitle', {
      defaultMessage: 'Step {step}',
      values: {
        step,
      },
    }),
  docLinkLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.stepsModal.docLinkLabel',
    {
      defaultMessage: 'View documentation',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.stepsModal.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
};

export const StepsModal: FunctionComponent<Props> = ({ closeModal, modalContent }) => {
  const { domainId, steps, documentationUrl } = modalContent;

  return (
    <EuiModal onClose={closeModal} data-test-subj="stepsModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiTitle size="m">
            <h2>{i18nTexts.getModalTitle(domainId)}</h2>
          </EuiTitle>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiSteps
          titleSize="xs"
          data-test-subj="fixDeprecationSteps"
          steps={steps.map((step, index) => {
            return {
              title: i18nTexts.getStepTitle(index + 1),
              children: (
                <EuiText>
                  <p>{step}</p>
                </EuiText>
              ),
            };
          })}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          {documentationUrl && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="help" target="_blank" href={documentationUrl}>
                {i18nTexts.docLinkLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeModal} fill data-test-subj="closeButton">
              {i18nTexts.closeButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
