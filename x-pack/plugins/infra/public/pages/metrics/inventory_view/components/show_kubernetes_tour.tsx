/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiText, EuiButtonEmpty } from '@elastic/eui';

interface Props {
  children: ReactElement;
}

const KUBERNETES_TOUR_STORAGE_KEY = 'showKubernetesTour';

export const ShowKubernetesTour = ({ children }: Props) => {
  const [isTourOpen, setIsTourOpen] = useState(() => {
    const initialState = localStorage.getItem(KUBERNETES_TOUR_STORAGE_KEY);
    return initialState !== 'false' ? true : false;
  });

  useEffect(() => {
    localStorage.setItem(KUBERNETES_TOUR_STORAGE_KEY, isTourOpen ? 'true' : 'false');
  }, [isTourOpen]);

  return (
    <div>
      <EuiTourStep
        content={
          <EuiText data-test-subj="infra-kubernetesTour-text">
            {i18n.translate('xpack.infra.homePage.kubernetesTour.text', {
              defaultMessage:
                'Click here to see your infrastructure in different ways, including Kubernetes pods.',
            })}
          </EuiText>
        }
        isStepOpen={isTourOpen}
        maxWidth={260}
        onFinish={() => setIsTourOpen(false)}
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
            onClick={() => setIsTourOpen(false)}
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
