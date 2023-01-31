/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTourStep, EuiText, EuiButtonEmpty } from '@elastic/eui';

interface Props {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children: ReactElement;
}

export const ShowKubernetesTour = ({ children, isOpen, setIsOpen }: Props) => {
  return (
    <div>
      <EuiTourStep
        content={
          <EuiText>
            <p>
              {i18n.translate('xpack.infra.homePage.kubernetesTour.text', {
                defaultMessage:
                  'Click here to see your infrastructure in different ways, including Kubernetes pods.',
              })}
            </p>
          </EuiText>
        }
        isStepOpen={isOpen}
        maxWidth={260}
        onFinish={() => setIsOpen(false)}
        step={1}
        stepsTotal={1}
        title={i18n.translate('xpack.infra.homePage.kubernetesTour.title', {
          defaultMessage: 'Want a different view?',
        })}
        anchorPosition="downCenter"
        footerAction={[
          <EuiButtonEmpty
            data-test-subj="infra-kubernetesTour-dismiss"
            size="s"
            color="text"
            onClick={() => setIsOpen(false)}
          >
            {i18n.translate('xpack.infra.homePage.kubernetesTour.dismiss', {
              defaultMessage: 'Dismiss',
            })}
          </EuiButtonEmpty>,
        ]}
      >
        {children}
      </EuiTourStep>
    </div>
  );
};
