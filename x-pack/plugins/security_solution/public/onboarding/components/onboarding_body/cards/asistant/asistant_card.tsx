/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { OnboardingCardId } from '../../../../constants';
import type { OnboardingCardComponent } from '../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { ConfigureConnector } from './components/configure_connector/configure_connector';
import { CardCallOut } from '../common/card_callout';

export const AsistantCard: OnboardingCardComponent = ({
  setComplete,
  isCardComplete,
  setExpandedCardId,
}) => {
  const isIntegrationsCardComplete = useMemo(
    () => isCardComplete(OnboardingCardId.integrations),
    [isCardComplete]
  );

  const expandIntegrationsCard = useCallback(() => {
    setExpandedCardId(OnboardingCardId.integrations, { scroll: true });
  }, [setExpandedCardId]);

  return (
    <OnboardingCardContentPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.ASSISTANT_CARD_DESCRIPTION}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {isIntegrationsCardComplete ? (
            <ConfigureConnector setComplete={setComplete} />
          ) : (
            <EuiFlexItem
              className={css`
                width: 45%;
              `}
            >
              <CardCallOut
                color="primary"
                icon="iInCircle"
                text={i18n.ASSISTANT_CARD_CALLOUT_INTEGRATIONS_TEXT}
                action={
                  <EuiLink onClick={expandIntegrationsCard}>
                    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                      <EuiFlexItem>{i18n.ASSISTANT_CARD_CALLOUT_INTEGRATIONS_BUTTON}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="arrowRight" color="primary" size="s" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiLink>
                }
              />
            </EuiFlexItem>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AsistantCard;
