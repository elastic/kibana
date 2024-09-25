/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useKibana } from '../../../../../common/lib/kibana';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentImagePanel } from '../common/card_content_image_panel';
import { CardCallOut } from '../common/card_callout';
import rulesImageSrc from './images/rules.png';
import * as i18n from './translations';
import { checkRulesComplete } from './rules_check_complete';

export const RulesCard: OnboardingCardComponent = ({
  isCardComplete,
  setExpandedCardId,
  setComplete,
}) => {
  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const {
    http: kibanaServicesHttp,
    notifications: { toasts },
  } = useKibana().services;

  const addError = useRef(toasts.addError.bind(toasts)).current;

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  useEffect(() => {
    const abortSignal = new AbortController();
    const autoCheckStepCompleted = async () => {
      const isDone = await checkRulesComplete({
        abortSignal,
        kibanaServicesHttp,
        onError: (error: Error) => {
          addError(error, { title: `Failed to check Card Rules completion.` });
        },
      });

      if (isDone) {
        setComplete(true);
      }
    };
    autoCheckStepCompleted();
    return () => {
      abortSignal.abort();
    };
  }, [kibanaServicesHttp, addError, setComplete]);

  return (
    <OnboardingCardContentImagePanel imageSrc={rulesImageSrc} imageAlt={i18n.RULES_CARD_TITLE}>
      <EuiFlexGroup
        direction="column"
        gutterSize="xl"
        justifyContent="flexStart"
        alignItems="flexStart"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.RULES_CARD_DESCRIPTION}
          </EuiText>
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
        <EuiFlexItem grow={false}>
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
