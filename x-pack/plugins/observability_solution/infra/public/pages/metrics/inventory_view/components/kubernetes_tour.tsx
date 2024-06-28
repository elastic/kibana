/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiText, EuiButtonEmpty } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

interface Props {
  children: ReactElement;
}

export const KUBERNETES_TOUR_STORAGE_KEY = 'isKubernetesTourSeen';

export const KubernetesTour = ({ children }: Props) => {
  const [isTourSeen, setIsTourSeen] = useLocalStorage(KUBERNETES_TOUR_STORAGE_KEY, false);
  const markTourAsSeen = () => setIsTourSeen(true);

  return (
    <div>
      <EuiTourStep
        content={
          <EuiText size="s" color="subdued" data-test-subj="infra-kubernetesTour-text">
            {i18n.translate('xpack.infra.homePage.kubernetesTour.text', {
              defaultMessage:
                'Click here to see your infrastructure in different ways, including Kubernetes pods.',
            })}
          </EuiText>
        }
        isStepOpen={!isTourSeen}
        maxWidth={350}
        onFinish={markTourAsSeen}
        step={1}
        stepsTotal={1}
        title={i18n.translate('xpack.infra.homePage.kubernetesTour.title', {
          defaultMessage: 'Want a different view?',
        })}
        anchorPosition="downCenter"
        footerAction={
          <EuiButtonEmpty
            data-test-subj="infra-kubernetesTour-dismiss"
            size="s"
            color="text"
            onClick={markTourAsSeen}
          >
            {i18n.translate('xpack.infra.homePage.kubernetesTour.dismiss', {
              defaultMessage: 'Dismiss',
            })}
          </EuiButtonEmpty>
        }
      >
        {children}
      </EuiTourStep>
    </div>
  );
};
