/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Indicator } from '../../../../../common/types/indicator';

export const BUTTON_TEST_ID = 'tiToggleIndicatorFlyoutButton';

export interface OpenIndicatorFlyoutButtonProps {
  indicator: Indicator;
  onOpen: (indicator: Indicator) => void;
  isOpen: boolean;
}

export const OpenIndicatorFlyoutButton: VFC<OpenIndicatorFlyoutButtonProps> = ({
  indicator,
  onOpen,
  isOpen,
}) => {
  const buttonLabel: string = i18n.translate(
    'xpack.threatIntelligence.indicator.table.viewDetailsButton',
    {
      defaultMessage: 'View details',
    }
  );

  return (
    <>
      <EuiToolTip content={buttonLabel} delay="long">
        <EuiButtonIcon
          data-test-subj={BUTTON_TEST_ID}
          color={isOpen ? 'primary' : 'text'}
          iconType={isOpen ? 'minimize' : 'expand'}
          isSelected={isOpen}
          iconSize="s"
          aria-label={buttonLabel}
          onClick={() => onOpen(indicator)}
        />
      </EuiToolTip>
    </>
  );
};
