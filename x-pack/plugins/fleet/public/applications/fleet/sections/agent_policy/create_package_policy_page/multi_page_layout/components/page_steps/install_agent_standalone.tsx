/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
// import { EuiText, EuiLink } from '@elastic/eui';

import type { MultiPageStepLayoutProps } from '../../types';
import { CreatePackagePolicyBottomBar } from '..';
export const InstallElasticAgentStandalonePageStep: React.FC<MultiPageStepLayoutProps> = (
  props
) => {
  const { cancelUrl, onNext, cancelClickHandler, setIsManaged } = props;
  return (
    <div>
      <>standalone </>
      {/* <EuiText>
        <FormattedMessage
          id="xpack.fleet.addIntegration.installAgentStepTitle"
          defaultMessage="These steps configure and enroll the Elastic Agent in Fleet to automatically deploy updates and
          centrally manage the agent. As an alternative to Fleet, advanced users can run agents in {standaloneLink}."
          values={{
            standaloneLink: <EuiLink onClick={() => setIsManaged(false)}>standalone mode</EuiLink>,
          }}
        />
      </EuiText> */}
      <CreatePackagePolicyBottomBar
        cancelUrl={cancelUrl}
        cancelClickHandler={cancelClickHandler}
        onNext={onNext}
        actionMessage={
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.installAgentButton"
            defaultMessage="Add the integration"
          />
        }
      />
    </div>
  );
};
