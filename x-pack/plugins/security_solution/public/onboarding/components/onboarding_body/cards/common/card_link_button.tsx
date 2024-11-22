/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { OnboardingCardId } from '../../../../constants';
import { SecuritySolutionLinkButton } from '../../../../../common/components/links';
import { useOnboardingContext } from '../../../onboarding_context';

export interface CardLinkButtonProps {
  linkId: string;
  cardId: OnboardingCardId;
}

export const withReportCardLinkClick = <T extends { onClick?: React.MouseEventHandler }>(
  WrappedComponent: React.ComponentType<T>
): React.FC<T & CardLinkButtonProps> =>
  React.memo(function WithReportCardLinkClick({ onClick, cardId, linkId, ...rest }) {
    const { telemetry } = useOnboardingContext();
    const onClickWithReport = useCallback<React.MouseEventHandler>(
      (ev) => {
        telemetry.reportCardLinkClicked(cardId, linkId);
        onClick?.(ev);
      },
      [telemetry, cardId, linkId, onClick]
    );
    return <WrappedComponent {...({ onClick: onClickWithReport, ...rest } as unknown as T)} />;
  });

export const CardLinkButton = withReportCardLinkClick(SecuritySolutionLinkButton);
CardLinkButton.displayName = 'CardLinkButton';
