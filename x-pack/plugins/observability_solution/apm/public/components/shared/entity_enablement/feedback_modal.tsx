/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiConfirmModal } from '@elastic/eui';

export function FeedbackModal({
  isFeedbackModalVisiable,
  setsIsFeedbackModalVisiable,
  refetch,
}: {
  isFeedbackModalVisiable: boolean;
  setsIsFeedbackModalVisiable: (value: boolean) => void;
  refetch: () => void;
}) {
  const closeModal = () => {
    setsIsFeedbackModalVisiable(false);
    refetch();
  };

  return (
    <>
      {isFeedbackModalVisiable && (
        <EuiConfirmModal
          title={i18n.translate('xpack.apm.eemFeedback.title', {
            defaultMessage: 'Thank you',
          })}
          onCancel={closeModal}
          onConfirm={closeModal}
          cancelButtonText={i18n.translate('xpack.apm.eemFeedback.button.cancel', {
            defaultMessage: 'Maybe later',
          })}
          confirmButtonText={
            <EuiButton
              data-test-subj="xpack.apm.eemFeedback.button.open"
              fill
              iconType="discuss"
              size="s"
              href="https://ela.st/services-feedback" // FIXME update with the new one
            >
              {i18n.translate('xpack.apm.eemFeedback.button.openSurvey', {
                defaultMessage: 'Open survey',
              })}
            </EuiButton>
          }
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate('xpack.apm.feedbackModal.body.thanks', {
              defaultMessage:
                'Thank you for trying the new services experience. Check back often as we continue to update this page. ',
            })}
          </p>
          <p>
            {i18n.translate('xpack.apm.feedbackModal.body.feedback', {
              defaultMessage:
                'Have any feedback or ideas for improvement? Let us know in a short survey.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
