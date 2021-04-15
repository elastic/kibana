/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';

const txtBody = (count: number) =>
  i18n.translate(
    'xpack.uiActionsEnhanced.drilldowns.containers.drilldownList.cloningNotification.body',
    {
      defaultMessage: '{count, number} {count, plural, one {drilldown} other {drilldowns}} cloned.',
      description: 'Title of notification show when one or more drilldowns were cloned.',
      values: {
        count,
      },
    }
  );

export interface CloningNotificationProps {
  count?: number;
}

export const CloningNotification: React.FC<CloningNotificationProps> = ({ count = 1 }) => {
  return (
    <>
      <EuiCallOut title={txtBody(count)} color="success" size="s" iconType="check" />
      <EuiSpacer />
    </>
  );
};
