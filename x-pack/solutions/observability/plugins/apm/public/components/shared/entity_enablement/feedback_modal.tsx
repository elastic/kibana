/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { KibanaEnvironmentContext } from '../../../context/kibana_environment_context/kibana_environment_context';
import { getPathForFeedback } from '../../../utils/get_path_for_feedback';

export function FeedbackModal({
  isFeedbackModalVisible = false,
  onClose,
}: {
  isFeedbackModalVisible?: boolean;
  onClose: () => void;
}) {
  const kibanaEnvironment = useContext(KibanaEnvironmentContext);
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = kibanaEnvironment;
  const sanitizedPath = getPathForFeedback(window.location.pathname);
  const { euiTheme } = useEuiTheme();

  return (
    <>
      {isFeedbackModalVisible && (
        <EuiConfirmModal
          style={{
            width: '600px',
          }}
          onCancel={onClose}
          onConfirm={onClose}
          confirmButtonText={
            <EuiButtonEmpty
              css={{
                color: euiTheme.colors.emptyShade,
              }}
              data-test-subj="xpack.apm.eemFeedback.button.open"
              iconType="discuss"
              target="_blank"
              size="s"
              href={getSurveyFeedbackURL({
                formUrl: 'https://ela.st/new-o11y-experience',
                kibanaVersion,
                isCloudEnv,
                isServerlessEnv,
                sanitizedPath,
              })}
            >
              {i18n.translate('xpack.apm.eemFeedback.button.openSurvey', {
                defaultMessage: 'Tell us what you think!',
              })}
            </EuiButtonEmpty>
          }
          defaultFocusedButton="confirm"
        >
          <EuiPanel hasShadow={false}>
            <EuiFlexGroup
              direction="column"
              justifyContent="center"
              alignItems="center"
              gutterSize="s"
            >
              <EuiFlexItem>
                <EuiIcon type="heart" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle>
                  <h2>
                    {i18n.translate('xpack.apm.eemFeedback.title', {
                      defaultMessage: 'Let us know what you think!',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiPanel hasShadow={false} paddingSize="s">
            <EuiText grow={false} size="s">
              <p>
                {i18n.translate('xpack.apm.feedbackModal.body.thanks', {
                  defaultMessage:
                    "Thank you for trying our new experience. We'll be continuing to improve on this so please come back often.",
                })}
              </p>
            </EuiText>
          </EuiPanel>
        </EuiConfirmModal>
      )}
    </>
  );
}
