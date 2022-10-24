/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import * as i18n from './translations';

interface ExceptionsTableUtilityBarProps {
  onRefresh?: () => void;
  totalExceptionLists: number;
}

export const ExceptionsTableUtilityBar: React.FC<ExceptionsTableUtilityBarProps> = ({
  onRefresh,
  totalExceptionLists,
}) => {
  return (
    <UtilityBar border>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingExceptionLists">
            {i18n.SHOWING_EXCEPTION_LISTS(totalExceptionLists)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarAction
            dataTestSubj="refreshRulesAction"
            iconSide="left"
            iconType="refresh"
            onClick={onRefresh}
          >
            {i18n.REFRESH_EXCEPTIONS_TABLE}
          </UtilityBarAction>
        </UtilityBarGroup>
      </UtilityBarSection>
    </UtilityBar>
  );
};

ExceptionsTableUtilityBar.displayName = 'ExceptionsTableUtilityBar';
