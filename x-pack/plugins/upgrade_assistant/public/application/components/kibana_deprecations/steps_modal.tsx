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
  EuiSpacer,
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

export interface ModalContent {
  domainId: string;
  steps: string[];
}

interface Props {
  closeModal: () => void;
  modalContent: ModalContent;
}

const i18nTexts = {
  getModalTitle: (domainId: string) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.stepsModal.modalTitle', {
      defaultMessage: `Fix '${domainId}'`,
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
  modalDescription: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.stepsModal.modalDescription',
    {
      defaultMessage: 'Follow the steps below to address this deprecation.',
    }
  ),
};

export const StepsModal: FunctionComponent<Props> = ({ closeModal, modalContent }) => {
  const { domainId, steps } = modalContent;

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiTitle size="m">
            <h2>{i18nTexts.getModalTitle(domainId)}</h2>
          </EuiTitle>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiText>
            <p>{i18nTexts.modalDescription}</p>
          </EuiText>

          <EuiSpacer />

          <EuiSteps
            titleSize="xs"
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
        </>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {/* TODO i18n and href */}
            <EuiButtonEmpty iconType="help" target="_blank" href="#">
              View documentation
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* TODO i18n */}
            <EuiButton onClick={closeModal} fill>
              Close window
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
