/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiGlobalToastList } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const KUBERNETES_TOAST_STORAGE_KEY = 'kubernetesToastKey';
const KUBERNETES_FEEDBACK_LINK = 'https://ela.st/k8s-feedback';

export const SurveyKubernetes = () => {
  const [isToastSeen, setIsToastSeen] = useLocalStorage(KUBERNETES_TOAST_STORAGE_KEY, false);
  const markToastAsSeen = () => setIsToastSeen(true);

  return (
    <>
      <EuiButton
        href={KUBERNETES_FEEDBACK_LINK}
        target="_blank"
        color="warning"
        iconType="editorComment"
        data-test-subj="infra-kubernetes-feedback-link"
      >
        <FormattedMessage
          id="xpack.infra.homePage.tellUsWhatYouThinkK8sLink"
          defaultMessage="Tell us what you think! (K8s)"
        />
      </EuiButton>
      {!isToastSeen && (
        <EuiGlobalToastList
          toastLifeTimeMs={Infinity}
          dismissToast={markToastAsSeen}
          toasts={[
            {
              id: 'k8s-toast',
              title: (
                <FormattedMessage
                  id="xpack.infra.homePage.kubernetesToastTitle"
                  defaultMessage="We need your help!"
                />
              ),
              color: 'primary',
              iconType: 'help',
              text: (
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.infra.homePage.kubernetesToastText"
                      defaultMessage="Help us design your Kubernetes experience by completing a feedback survey."
                    />
                  </p>
                  <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="infra-toast-kubernetes-survey-start"
                        href={KUBERNETES_FEEDBACK_LINK}
                        target="_blank"
                        onClickCapture={markToastAsSeen}
                        size="s"
                      >
                        <FormattedMessage
                          id="xpack.infra.homePage.kubernetesToastButton"
                          defaultMessage="Start survey"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              ),
            },
          ]}
        />
      )}
    </>
  );
};
