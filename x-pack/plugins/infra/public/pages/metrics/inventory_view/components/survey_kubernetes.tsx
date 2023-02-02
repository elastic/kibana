/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiGlobalToastList } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';

const KUBERNETES_TOAST_STORAGE_KEY = 'kubernetesToastKey';
const KUBERNETES_FEEDBACK_LINK = 'https://ela.st/k8s-feedback';

const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noreferrer');
};

export const SurveyKubernetes = () => {
  const { nodeType } = useWaffleOptionsContext();
  const podNodeType: typeof nodeType = 'pod';

  const [isToastSeen, setIsToastSeen] = useState(() => {
    const initialState = localStorage.getItem(KUBERNETES_TOAST_STORAGE_KEY);
    return initialState === 'true';
  });

  useEffect(() => {
    localStorage.setItem(KUBERNETES_TOAST_STORAGE_KEY, isToastSeen ? 'true' : 'false');
  }, [isToastSeen]);

  return (
    <>
      {nodeType === podNodeType && (
        <>
          <EuiButton
            href={KUBERNETES_FEEDBACK_LINK}
            target="_blank"
            color="warning"
            iconType="editorComment"
          >
            <FormattedMessage
              id="xpack.infra.homePage.tellUsWhatYouThinkK8sLink"
              defaultMessage="Tell us what you think: K8s!"
            />
          </EuiButton>
          {!isToastSeen && (
            <EuiGlobalToastList
              toastLifeTimeMs={Infinity}
              dismissToast={() => {
                setIsToastSeen(true);
              }}
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
                  toastLifeTimeMs: 0x7fffffff, // Biggest possible lifetime because we control when it should be visible using isToastSeen
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
                            onClick={() => {
                              openInNewTab(KUBERNETES_FEEDBACK_LINK);
                              setIsToastSeen(true);
                            }}
                            size="s"
                          >
                            Start survey
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
      )}
    </>
  );
};
