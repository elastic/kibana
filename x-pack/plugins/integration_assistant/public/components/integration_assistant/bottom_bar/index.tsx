/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/hooks/use_kibana';
import { AssistantState } from '../hooks/use_assistant_state';

interface IntegrationAssistantBottomBarProps {
  currentStep: number;
  setStep: (step: number) => void;
  result: AssistantState['result'];
  onGenerate: () => void;
  isNextStepEnabled?: boolean;
}

export const IntegrationAssistantBottomBar = React.memo<IntegrationAssistantBottomBarProps>(
  ({ currentStep, setStep, result, onGenerate, isNextStepEnabled = false }) => {
    const integrationsUrl = useKibana().services.application.getUrlForApp('integrations');

    return (
      <EuiFlexGroup direction="row" justifyContent="flexEnd" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiButton color="danger" href={integrationsUrl}>
            <FormattedMessage
              id="xpack.fleet.integrationsAssistant.cancel"
              defaultMessage="Cancel"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* {currentStep === 3 && result == null ? (
            <EuiButton
              fill
              color="primary"
              onClick={() => onGenerate()}
              isDisabled={!isNextStepEnabled}
            >
              <FormattedMessage
                id="xpack.fleet.integrationsAssistant.generate"
                defaultMessage="Generate"
              />
            </EuiButton>
          ) : ( */}
          <EuiButton
            fill
            color="primary"
            onClick={() => setStep(currentStep + 1)}
            isDisabled={!isNextStepEnabled}
          >
            <FormattedMessage id="xpack.fleet.integrationsAssistant.next" defaultMessage="Next" />
          </EuiButton>
          {/* )} */}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
IntegrationAssistantBottomBar.displayName = 'IntegrationAssistantBottomBar';
