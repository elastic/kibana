/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  CustomLogsSteps,
  useWizard,
} from '../../components/app/custom_logs/wizard';
import { ConfigureLogs } from '../../components/app/custom_logs/wizard/configure_logs';
import { Inspect } from '../../components/app/custom_logs/wizard/inspect';
import { InstallElasticAgent } from '../../components/app/custom_logs/wizard/install_elastic_agent';
import { SelectLogs } from '../../components/app/custom_logs/wizard/select_logs';

function Page({
  step,
  component,
}: {
  step: CustomLogsSteps;
  component: React.ReactNode;
}) {
  const { setCurrentStep } = useWizard();
  useEffect(() => {
    setCurrentStep(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return <>{component}</>;
}

export const customLogsRoutes = {
  '/customLogs': {
    handler: () =>
      Page({
        step: 'selectLogs',
        component: <SelectLogs />,
      }),
    params: {},
    exact: true,
  },
  '/customLogs/selectLogs': {
    handler: () =>
      Page({
        step: 'selectLogs',
        component: <SelectLogs />,
      }),
    params: {},
    exact: true,
  },
  '/customLogs/configureLogs': {
    handler: () =>
      Page({
        step: 'configureLogs',
        component: <ConfigureLogs />,
      }),
    params: {},
    exact: true,
  },
  '/customLogs/installElasticAgent': {
    handler: () =>
      Page({
        step: 'installElasticAgent',
        component: <InstallElasticAgent />,
      }),
    params: {},
    exact: true,
  },
  '/customLogs/inspect': {
    handler: () =>
      Page({
        step: 'inspect',
        component: <Inspect />,
      }),
    params: {},
    exact: true,
  },
};
