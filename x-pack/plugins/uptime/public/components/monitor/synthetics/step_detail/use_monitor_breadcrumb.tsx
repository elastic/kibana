/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { JourneyState } from '../../../../state/reducers/journey';
import { Ping } from '../../../../../common/runtime_types/ping';

interface Props {
  journey: JourneyState;
  activeStep?: Ping;
}

export const useMonitorBreadcrumb = ({ journey, activeStep }: Props) => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  useBreadcrumbs([
    ...(activeStep?.monitor?.name
      ? [
          {
            text: activeStep?.monitor?.name || activeStep?.monitor.id,
            href: `/app/uptime/monitor/${btoa(activeStep?.monitor.id)}`,
          },
        ]
      : []),
    ...(journey?.details?.timestamp
      ? [{ text: moment(journey?.details?.timestamp).format(dateFormat) }]
      : []),
  ]);
};
