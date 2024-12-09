/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { MultiPageStepLayoutProps } from '../../types';
import { useStartServices } from '../../../../../../hooks';

import {
  ConfirmIncomingDataWithPreview,
  ConfirmIncomingDataStandalone,
  CreatePackagePolicyFinalBottomBar,
  NotObscuredByBottomBar,
} from '..';

const BottomBar: React.FC<{
  packageInfoName: string;
  packageInfoVersion: string;
}> = ({ packageInfoName, packageInfoVersion }) => (
  <>
    <NotObscuredByBottomBar />
    <CreatePackagePolicyFinalBottomBar pkgkey={`${packageInfoName}-${packageInfoVersion}`} />
  </>
);

export const ConfirmDataPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const { enrolledAgentIds, packageInfo, isManaged } = props;
  const core = useStartServices();

  const [agentDataConfirmed, setAgentDataConfirmed] = useState(false);
  const { docLinks } = core;
  const troubleshootLink = docLinks.links.fleet.troubleshooting;

  if (!isManaged) {
    return (
      <>
        <ConfirmIncomingDataStandalone troubleshootLink={troubleshootLink} />
        <BottomBar packageInfoName={packageInfo.name} packageInfoVersion={packageInfo.version} />
      </>
    );
  }

  return (
    <>
      <ConfirmIncomingDataWithPreview
        agentIds={enrolledAgentIds}
        packageInfo={packageInfo}
        agentDataConfirmed={agentDataConfirmed}
        setAgentDataConfirmed={setAgentDataConfirmed}
        troubleshootLink={troubleshootLink}
      />

      {!!agentDataConfirmed && (
        <BottomBar packageInfoName={packageInfo.name} packageInfoVersion={packageInfo.version} />
      )}
    </>
  );
};
