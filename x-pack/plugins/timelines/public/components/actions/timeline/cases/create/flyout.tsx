/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import * as i18n from '../translations';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { Case } from '../../../../../../../cases/common';
import type { TimelinesStartServices } from '../../../../../types';

export interface CreateCaseModalProps {
  afterCaseCreated?: (theCase: Case) => Promise<void>;
  onCloseFlyout: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  useInsertTimeline?: Function;
  appId: string;
  disableAlerts?: boolean;
}

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `
    z-index: ${theme.eui.euiZLevel5};
  `}
`;

const maskOverlayClassName = 'create-case-flyout-mask-overlay';

/**
 * We need to target the mask overlay which is a parent element
 * of the flyout.
 * A global style is needed to target a parent element.
 */

const GlobalStyle = createGlobalStyle<{ theme: { eui: { euiZLevel5: number } } }>`
  .${maskOverlayClassName} {
    ${({ theme }) => `
    z-index: ${theme.eui.euiZLevel5};
  `}
  }
`;

// Adding bottom padding because timeline's
// bottom bar gonna hide the submit button.
const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  ${({ theme }) => `
    && .euiFlyoutBody__overflow {
      overflow-y: auto;
      overflow-x: hidden;
    }

    && .euiFlyoutBody__overflowContent {
      display: block;
      padding: ${theme.eui.paddingSizes.l} ${theme.eui.paddingSizes.l} 70px;
      height: auto;
    }
  `}
`;

const FormWrapper = styled.div`
  width: 100%;
`;

const CreateCaseFlyoutComponent: React.FC<CreateCaseModalProps> = ({
  afterCaseCreated,
  onCloseFlyout,
  onSuccess,
  appId,
  disableAlerts,
}) => {
  const { cases } = useKibana<TimelinesStartServices>().services;
  const createCaseProps = useMemo(() => {
    return {
      afterCaseCreated,
      onCancel: onCloseFlyout,
      onSuccess,
      withSteps: false,
      owner: [appId],
      disableAlerts,
    };
  }, [afterCaseCreated, onCloseFlyout, onSuccess, appId, disableAlerts]);
  return (
    <>
      <GlobalStyle />
      <StyledFlyout
        onClose={onCloseFlyout}
        data-test-subj="create-case-flyout"
        maskProps={{ className: maskOverlayClassName }}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{i18n.CREATE_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <StyledEuiFlyoutBody>
          <FormWrapper>{cases.getCreateCase(createCaseProps)}</FormWrapper>
        </StyledEuiFlyoutBody>
      </StyledFlyout>
    </>
  );
};

export const CreateCaseFlyout = memo(CreateCaseFlyoutComponent);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
