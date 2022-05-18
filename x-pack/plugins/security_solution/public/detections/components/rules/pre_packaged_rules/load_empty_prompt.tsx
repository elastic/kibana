/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import * as i18n from './translations';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { usePrePackagedRules } from '../../../containers/detection_engine/rules';
import { useUserData } from '../../user_info';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
`;

EmptyPrompt.displayName = 'EmptyPrompt';

interface PrePackagedRulesPromptProps {
  createPrePackagedRules: () => void;
  loading: boolean;
  userHasPermissions: boolean;
}

const PrePackagedRulesPromptComponent: React.FC<PrePackagedRulesPromptProps> = ({
  createPrePackagedRules,
  loading = false,
  userHasPermissions = false,
}) => {
  const handlePreBuiltCreation = useCallback(() => {
    createPrePackagedRules();
  }, [createPrePackagedRules]);

  const [{ isSignalIndexExists, isAuthenticated, hasEncryptionKey, canUserCRUD, hasIndexWrite }] =
    useUserData();

  const { getLoadPrebuiltRulesAndTemplatesButton } = usePrePackagedRules({
    canUserCRUD,
    hasIndexWrite,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
  });

  const loadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: !userHasPermissions || loading,
        onClick: handlePreBuiltCreation,
        fill: true,
        'data-test-subj': 'load-prebuilt-rules',
      }),
    [getLoadPrebuiltRulesAndTemplatesButton, handlePreBuiltCreation, userHasPermissions, loading]
  );

  return (
    <EmptyPrompt
      data-test-subj="rulesEmptyPrompt"
      title={<h2>{i18n.PRE_BUILT_TITLE}</h2>}
      body={<p>{i18n.PRE_BUILT_MSG}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>{loadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SecuritySolutionLinkButton
              isDisabled={!userHasPermissions}
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
