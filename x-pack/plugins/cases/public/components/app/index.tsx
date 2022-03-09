/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { APP_OWNER } from '../../../common/constants';
import { useApplicationCapabilities } from '../../common/lib/kibana';

import { getCasesLazy } from '../../methods';
import { Wrapper } from '../wrappers';
import { CasesRoutesProps } from './types';

export type CasesProps = CasesRoutesProps;

const CasesAppComponent: React.FC = () => {
  const userCapabilities = useApplicationCapabilities();

  return (
    <Wrapper>
      {getCasesLazy({
        owner: [APP_OWNER],
        useFetchAlertData: () => [false, {}],
        userCanCrud: userCapabilities.crud,
        basePath: '/',
        features: { alerts: { sync: false } },
        releasePhase: 'experimental',
      })}
    </Wrapper>
  );
};

CasesAppComponent.displayName = 'CasesApp';

export const CasesApp = React.memo(CasesAppComponent);
