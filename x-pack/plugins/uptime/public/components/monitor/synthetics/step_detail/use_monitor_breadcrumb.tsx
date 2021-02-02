/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useKibana, useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { JourneyState } from '../../../../state/reducers/journey';
import { Ping } from '../../../../../common/runtime_types/ping';
import { PLUGIN } from '../../../../../common/constants/plugin';

interface Props {
  journey: JourneyState;
  activeStep?: Ping;
}

export const useMonitorBreadcrumb = ({ journey, activeStep }: Props) => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.ID) ?? '';

  useBreadcrumbs([
    ...(activeStep?.monitor
      ? [
          {
            text: activeStep?.monitor?.name || activeStep?.monitor.id,
            href: `${appPath}/monitor/${btoa(activeStep?.monitor.id)}`,
          },
        ]
      : []),
    ...(journey?.details?.timestamp
      ? [{ text: moment(journey?.details?.timestamp).format(dateFormat) }]
      : []),
  ]);
};
