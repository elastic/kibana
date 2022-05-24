/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { MultiPageStepLayoutProps } from '../../types';
import { useStartServices } from '../../../../../../hooks';

import { ConfirmIncomingDataWithPreview } from '..';

export const ConfirmDataPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const { enrolledAgentIds, packageInfo } = props;
  const core = useStartServices();

  const [agentDataConfirmed, setAgentDataConfirmed] = useState(false);
  const { docLinks } = core;
  const troubleshootLink = docLinks.links.fleet.troubleshooting;
  return (
    <>
      <ConfirmIncomingDataWithPreview
        agentIds={enrolledAgentIds}
        installedPolicy={packageInfo}
        agentDataConfirmed={agentDataConfirmed}
        setAgentDataConfirmed={setAgentDataConfirmed}
        troubleshootLink={troubleshootLink}
      />
    </>
  );
};
