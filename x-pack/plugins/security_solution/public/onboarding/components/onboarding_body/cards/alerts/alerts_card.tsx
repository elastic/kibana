/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  COLOR_MODES_STANDARD,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';
import * as i18n from './translations';
import { StepSelector } from '../common/step_selector';
import { alertsIntroSteps } from './constants';

export const AlertsCard: OnboardingCardComponent = ({
  isCardComplete,
  setExpandedCardId,
  setComplete,
}) => {
  const { colorMode } = useEuiTheme();
  const [selectedStep, setSelectedStep] = useState(alertsIntroSteps[0]);

  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  return (
    <OnboardingCardContentImagePanel media={selectedStep.asset}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="alertsCardDescription" size="s">
            {i18n.ALERTS_CARD_DESCRIPTION}
          </EuiText>
          <EuiSpacer />
          <StepSelector
            title={i18n.ALERTS_CARD_STEP_SELECTOR_TITLE}
            steps={alertsIntroSteps}
            onSelect={setSelectedStep}
            selectedStep={selectedStep}
          />
          {!isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.ALERTS_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.ALERTS_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="arrowRight" color="primary" size="s" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiLink>
                }
              />
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="alertsCardButton" grow={false}>
          <SecuritySolutionLinkButton
            onClick={() => setComplete(true)}
            deepLinkId={SecurityPageName.alerts}
            fill
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.ALERTS_CARD_VIEW_ALERTS_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AlertsCard;
