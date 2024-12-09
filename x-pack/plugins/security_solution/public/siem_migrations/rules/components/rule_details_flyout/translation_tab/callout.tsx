/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import {
  RuleMigrationTranslationResultEnum,
  type RuleMigrationTranslationResult,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';

const getCallOutInfo = (
  translationResult: RuleMigrationTranslationResult
): { title: string; message?: string; icon: IconType; color: 'success' | 'warning' | 'danger' } => {
  switch (translationResult) {
    case RuleMigrationTranslationResultEnum.full:
      return {
        title: i18n.CALLOUT_TRANSLATED_RULE_TITLE,
        icon: 'checkInCircleFilled',
        color: 'success',
      };
    case RuleMigrationTranslationResultEnum.partial:
      return {
        title: i18n.CALLOUT_PARTIALLY_TRANSLATED_RULE_TITLE,
        message: i18n.CALLOUT_PARTIALLY_TRANSLATED_RULE_DESCRIPTION,
        icon: 'warningFilled',
        color: 'warning',
      };
    case RuleMigrationTranslationResultEnum.untranslatable:
      return {
        title: i18n.CALLOUT_NOT_TRANSLATED_RULE_TITLE,
        message: i18n.CALLOUT_NOT_TRANSLATED_RULE_DESCRIPTION,
        icon: 'checkInCircleFilled',
        color: 'danger',
      };
  }
};

export interface TranslationCallOutProps {
  translationResult: RuleMigrationTranslationResult;
}

export const TranslationCallOut: FC<TranslationCallOutProps> = React.memo(
  ({ translationResult }) => {
    const { title, message, icon, color } = getCallOutInfo(translationResult);

    return (
      <EuiCallOut
        color={color}
        title={title}
        iconType={icon}
        data-test-subj={`ruleMigrationCallOut-${translationResult}`}
      >
        {message}
      </EuiCallOut>
    );
  }
);
TranslationCallOut.displayName = 'TranslationCallOut';
