/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { LineClamp } from '../../../../common/components/line_clamp';
import { useEventDetailsPanelContext } from '../event/context';

export const RuleDetails = () => {
  const { getFieldsData } = useEventDetailsPanelContext();
  const description = getFieldsData('kibana.alert.rule.description') as string;
  return (
    <EuiFlexGroup
      css={css`
        flex-wrap: nowrap;
        & .euiFlexGroup {
          flex-wrap: nowrap;
        }
      `}
      direction="column"
      wrap={false}
      gutterSize="none"
    >
      <EuiFlexItem data-test-subj="ruleDetails">
        <EuiTitle size="xxs">
          <h5>{'Rule description'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <LineClamp>{description}</LineClamp>
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <EuiButton iconType="documentation">{'View investigation guide'}</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
