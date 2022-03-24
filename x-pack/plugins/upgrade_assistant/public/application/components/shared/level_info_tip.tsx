/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';

const i18nTexts = {
  critical: i18n.translate('xpack.upgradeAssistant.levelInfoTip.criticalLabel', {
    defaultMessage: 'Critical issues must be resolved before you upgrade',
  }),
  warning: i18n.translate('xpack.upgradeAssistant.levelInfoTip.warningLabel', {
    defaultMessage: 'Warning issues can be ignored at your discretion',
  }),
};

interface Props {
  level: 'critical' | 'warning';
}

export const LevelInfoTip: FunctionComponent<Props> = ({ level }) => {
  return <EuiIconTip content={i18nTexts[level]} position="top" type="iInCircle" />;
};
