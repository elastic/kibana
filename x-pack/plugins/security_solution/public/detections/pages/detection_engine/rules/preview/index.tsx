/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { RulePreview } from '../../../../components/rules/rule_preview';
import type { AboutStepRule, DefineStepRule, ScheduleStepRule } from '../types';

import * as i18n from './translations';

const StyledEuiFlyout = styled(EuiFlyout)`
  clip-path: none;
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    mask-image: none;
  }
`;

interface PreviewFlyoutProps {
  isDisabled: boolean;
  defineStepData: DefineStepRule;
  aboutStepData: AboutStepRule;
  scheduleStepData: ScheduleStepRule;
  exceptionsList?: List[];
  onClose: () => void;
}

const PreviewFlyoutComponent: React.FC<PreviewFlyoutProps> = ({
  isDisabled,
  defineStepData,
  aboutStepData,
  scheduleStepData,
  exceptionsList,
  onClose,
}) => {
  return (
    <StyledEuiFlyout type="push" size="550px" ownFocus={false} onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.RULE_PREVIEW_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>{i18n.RULE_PREVIEW_DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <RulePreview
          isDisabled={isDisabled}
          defineRuleData={defineStepData}
          aboutRuleData={aboutStepData}
          scheduleRuleData={scheduleStepData}
          exceptionsList={exceptionsList}
        />
      </StyledEuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={onClose}>{i18n.CANCEL_BUTTON_LABEL}</EuiButton>
      </EuiFlyoutFooter>
    </StyledEuiFlyout>
  );
};

export const PreviewFlyout = React.memo(PreviewFlyoutComponent);
