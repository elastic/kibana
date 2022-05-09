/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Score } from '../../common/types';

interface Props {
  value: Score;
}

export const CspHealthBadge = ({ value }: Props) => {
  if (value <= 65) {
    return (
      <EuiBadge color="danger">
        <FormattedMessage id="xpack.csp.cspHealthBadge.criticalLabel" defaultMessage="Critical" />
      </EuiBadge>
    );
  }

  if (value <= 86) {
    return (
      <EuiBadge color="warning">
        <FormattedMessage id="xpack.csp.cspHealthBadge.warningLabel" defaultMessage="Warning" />
      </EuiBadge>
    );
  }

  if (value <= 100) {
    return (
      <EuiBadge color="success">
        <FormattedMessage id="xpack.csp.cspHealthBadge.healthyLabel" defaultMessage="Healthy" />
      </EuiBadge>
    );
  }

  return null;
};
