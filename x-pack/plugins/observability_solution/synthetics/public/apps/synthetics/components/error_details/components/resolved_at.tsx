/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useFindMyKillerState } from '../hooks/use_find_my_killer_state';

export const ResolvedAt: React.FC = () => {
  const { killerState } = useFindMyKillerState();

  const formatter = useDateFormat();
  let endsAt: string | ReactElement = formatter(killerState?.timestamp ?? '');

  if (!endsAt) {
    endsAt = 'N/A';
  }

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: endsAt }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.errorDetails.resolvedAt', {
  defaultMessage: 'Resolved at',
});
