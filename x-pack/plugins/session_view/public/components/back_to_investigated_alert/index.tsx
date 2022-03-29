/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStyles } from './styles';

interface BackInvestigatedAlertDeps {
  isDisplayedAbove?: boolean;
  onClick: () => void;
}

export const BUTTON_TEST_ID = 'sessionView:backToInvestigatedAlert';

/**
 * Jump back to investigated alert button, should appear
 * when user scrolls the investigated event out of view.
 */
export const BackToInvestigatedAlert = ({
  isDisplayedAbove = false,
  onClick,
}: BackInvestigatedAlertDeps) => {
  const styles = useStyles({ isDisplayedAbove });

  return (
    <div css={styles.container}>
      <EuiBadge
        color={styles.buttonBackgroundColor}
        css={styles.jumpBackBadge}
        iconType={isDisplayedAbove ? 'arrowUp' : 'arrowDown'}
        iconSide="right"
        onClick={onClick}
        onClickAriaLabel="Back to investigated alert"
        data-test-subj={BUTTON_TEST_ID}
      >
        <FormattedMessage
          id="xpack.sessionView.backToInvestigatedAlert"
          defaultMessage="Back to investigated alert"
        />
      </EuiBadge>
    </div>
  );
};
