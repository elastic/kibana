/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { userHasPermissions } from '../../../pages/detection_engine/rules/helpers';
import { useUserData } from '../../user_info';
import { LoadPrePackagedRules } from './load_prepackaged_rules';
import { LoadPrePackagedRulesButton } from './load_prepackaged_rules_button';
import * as i18n from './translations';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
`;

EmptyPrompt.displayName = 'EmptyPrompt';

const PrePackagedRulesPromptComponent = () => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = userHasPermissions(canUserCRUD);

  return (
    <EmptyPrompt
      data-test-subj="rulesEmptyPrompt"
      title={<h2>{i18n.PRE_BUILT_TITLE}</h2>}
      body={<p>{i18n.PRE_BUILT_MSG}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <LoadPrePackagedRules>
              {(renderProps) => (
                <LoadPrePackagedRulesButton
                  fill
                  data-test-subj="load-prebuilt-rules"
                  {...renderProps}
                />
              )}
            </LoadPrePackagedRules>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SecuritySolutionLinkButton
              isDisabled={!hasPermissions}
              iconType="plusInCircle"
              deepLinkId={SecurityPageName.rulesCreate}
            >
              {i18n.CREATE_RULE_ACTION}
            </SecuritySolutionLinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

export const PrePackagedRulesPrompt = memo(PrePackagedRulesPromptComponent);
