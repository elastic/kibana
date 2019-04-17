/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { WATCH_STATES } from '../../../../common/constants/watch_states';

const WatchActionStatusUi = ({ intl, watchState }: { intl: InjectedIntl; watchState: string }) => {
  const stateToIcon: { [key: string]: JSX.Element } = {
    [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
    [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="grey" />,
    [WATCH_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
    [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
    [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
  };

  return <div>{stateToIcon[watchState]}</div>;
};

export const WatchActionStatus = injectI18n(WatchActionStatusUi);
