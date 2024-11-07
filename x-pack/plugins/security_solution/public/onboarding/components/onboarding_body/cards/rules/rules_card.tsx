/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';

import * as i18n from './translations';
import { StepSelector } from '../common/step_selector';
import { rulesIntroSteps } from './constants';

export const RulesCard: OnboardingCardComponent = ({ isCardComplete, setExpandedCardId }) => {
  const [selectedStep, setSelectedStep] = useState(rulesIntroSteps[0]);

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
          <EuiText data-test-subj="rulesCardDescription" size="s">
            {i18n.RULES_CARD_DESCRIPTION}
          </EuiText>
          <EuiSpacer />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <StepSelector
                title={i18n.RULES_CARD_STEP_SELECTOR_TITLE}
                steps={rulesIntroSteps}
                onSelect={setSelectedStep}
                selectedStep={selectedStep}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {!isIntegrationsCardComplete && (
            <>
              <EuiSpacer size="m" />
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.RULES_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.RULES_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
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
        <EuiFlexItem data-test-subj="rulesCardButton" grow={false}>
          <SecuritySolutionLinkButton
            deepLinkId={SecurityPageName.rules}
            fill
            isDisabled={!isIntegrationsCardComplete}
          >
            {i18n.RULES_CARD_ADD_RULES_BUTTON}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentImagePanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default RulesCard;
