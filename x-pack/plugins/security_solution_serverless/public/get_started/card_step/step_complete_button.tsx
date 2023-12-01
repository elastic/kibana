/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import icon_cross from '../images/icon_cross.svg';
import { MARK_AS_DONE_TITLE, UNDO_MARK_AS_DONE_TITLE } from '../translations';

const StepCompleteButtonComponent = ({
  isStepDone,
  onClick,
}: {
  isStepDone: boolean;
  onClick: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const handleStepButtonClicked = useCallback(() => {
    onClick?.();
  }, [onClick]);
  return (
    <EuiButtonEmpty
      color="primary"
      iconType={isStepDone ? icon_cross : 'checkInCircleFilled'}
      size="xs"
      css={css`
        margin-right: ${euiTheme.base * 0.375}px;
        border-radius: ${euiTheme.border.radius.medium};
        border: 1px solid ${euiTheme.colors.lightShade};
        .euiIcon {
          inline-size: ${euiTheme.size.m};
        }
      `}
      onClick={handleStepButtonClicked}
    >
      {isStepDone ? UNDO_MARK_AS_DONE_TITLE : MARK_AS_DONE_TITLE}
    </EuiButtonEmpty>
  );
};

export const StepCompleteButton = React.memo(StepCompleteButtonComponent);
