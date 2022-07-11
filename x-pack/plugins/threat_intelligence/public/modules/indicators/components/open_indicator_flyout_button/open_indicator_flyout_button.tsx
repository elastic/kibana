/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, VFC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Indicator } from '../../../../../common/types/Indicator';
import { IndicatorsFlyout } from '../indicators_flyout/indicators_flyout';

export const BUTTON_TEST_ID = 'tiOpenIndicatorFlyoutButton';

export const OpenIndicatorFlyoutButton: VFC<{ indicator: Indicator }> = ({ indicator }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

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
          color={isFlyoutOpen ? 'primary' : 'text'}
          iconType={isFlyoutOpen ? 'minimize' : 'expand'}
          isSelected={isFlyoutOpen}
          iconSize="s"
          aria-label={buttonLabel}
          onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
        />
      </EuiToolTip>
      {isFlyoutOpen && (
        <IndicatorsFlyout indicator={indicator} closeFlyout={() => setIsFlyoutOpen(false)} />
      )}
    </>
  );
};
