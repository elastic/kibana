/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { useParams } from 'react-router-dom';

import { ConfigKey } from '../../../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../../../monitor_details/hooks/use_selected_monitor';
import { useJourneySteps } from '../../../../monitor_details/hooks/use_journey_steps';
import { useSyntheticsSettingsContext } from '../../../../../contexts';

export const ViewApmLink = () => {
  const { basePath } = useSyntheticsSettingsContext();
  const { monitorId, checkGroupId } = useParams<{
    monitorId: string;
    checkGroupId: string;
    stepIndex: string;
  }>();
  const { data } = useJourneySteps();
  const { gte, lt } = data?.details?.journey?.monitor?.timespan ?? {
    gte: undefined,
    lt: undefined,
  };

  const monitor = useSelectedMonitor();
  const serviceName = monitor?.monitor?.[ConfigKey.APM_SERVICE_NAME];

  const relatedServiceLink = `${basePath}/app/apm/services?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=${gte}&rangeTo=${lt}&offset=1d&kuery=transaction.synthetics.monitor.id%20:%20${monitorId}%20and%20transaction.synthetics.monitor.check_group:%20${checkGroupId}`;
  const transactionsLink = `${basePath}/app/apm/services/${serviceName}/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&offset=1d&rangeFrom=${gte}&rangeTo=${lt}&transactionType=http-request`;

  return (
    <EuiFlexGroup css={{ flexGrow: 0 }}>
      <EuiButtonEmpty
        disabled={!serviceName}
        css={{ justifySelf: 'flex-end' }}
        size="xs"
        href={transactionsLink}
      >
        {VIEW_APM_TRANSACTIONS}
      </EuiButtonEmpty>

      <EuiButtonEmpty css={{ justifySelf: 'flex-end' }} size="xs" href={relatedServiceLink}>
        {VIEW_APM_SERVICES}
      </EuiButtonEmpty>
    </EuiFlexGroup>
  );
};

const VIEW_APM_TRANSACTIONS = i18n.translate(
  'xpack.synthetics.waterfall.viewAPMTransactions.label',
  {
    defaultMessage: 'View APM transactions',
  }
);

const VIEW_APM_SERVICES = i18n.translate('xpack.synthetics.waterfall.viewAPMTransactions.label', {
  defaultMessage: 'View APM services',
});
