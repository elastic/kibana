/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useUpgradeAssistantHref } from '../../shared/Links/kibana';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';

interface Props {
  status: FETCH_STATUS | undefined;
}

export function NoServicesMessage({ historicalDataFound, status }: Props) {
  const upgradeAssistantHref = useUpgradeAssistantHref();

  if (historicalDataFound) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
              defaultMessage: 'No services found',
            })}
          </div>
        }
        titleSize="s"
      />
    );
  }

  return (
    <EuiEmptyPrompt
      title={
        <div>
          {i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
            defaultMessage: 'No services found',
          })}
        </div>
      }
      titleSize="s"
    />
  );
}
