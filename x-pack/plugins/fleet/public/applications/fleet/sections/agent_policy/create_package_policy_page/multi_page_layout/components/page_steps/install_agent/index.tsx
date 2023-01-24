/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useState } from 'react';

import type { MultiPageStepLayoutProps } from '../../../types';

import { usePollingAgentCount } from '../../../../../../../../../components/agent_enrollment_flyout/confirm_agent_enrollment';

import { InstallElasticAgentManagedPageStep } from './install_agent_managed';
import { InstallElasticAgentStandalonePageStep } from './install_agent_standalone';

export const InstallElasticAgentPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const [localIsManaged, setLocalIsManaged] = useState(props.isManaged);
  const [useLocalState, setUseLocalState] = useState(false);

  const enrolledAgentIds = usePollingAgentCount(props.agentPolicy?.id || '', {
    noLowerTimeLimit: true,
    pollImmediately: true,
  });
  const onNext = () => {
    props.setEnrolledAgentIds(enrolledAgentIds);
    props.onNext();
  };

  const managedPageProps = {
    ...props,
    onNext,
    enrolledAgentIds,
    setIsManaged: useLocalState ? setLocalIsManaged : props.setIsManaged,
  };
  if (localIsManaged) {
    return <InstallElasticAgentManagedPageStep {...managedPageProps} />;
  }
  const standalonePageProps = {
    ...props,
    onNext,
    enrolledAgentIds,
    setIsManaged: (newIsManaged: boolean) => {
      if (newIsManaged) {
        // once you are in the standalone set of steps and the package policy
        // has been created, there is no going back to the managed steps.
        // instead only this page view is toggled.
        setUseLocalState(true);
      }
      setLocalIsManaged(newIsManaged);
    },
  };
  return <InstallElasticAgentStandalonePageStep {...standalonePageProps} />;
};
