/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useHistory } from 'react-router-dom';
import { getCreateRuleUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18n from './translations';
import { LinkButton } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { useFormatUrl } from '../../../../common/components/link_to';
import { usePrePackagedRules } from '../../../containers/detection_engine/rules';
import { useUserData } from '../../user_info';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
`;

EmptyPrompt.displayName = 'EmptyPrompt';

interface PrePackagedRulesPromptProps {
  createPrePackagedRules: () => void;
  loading: boolean;
  userHasNoPermissions: boolean;
}

const PrePackagedRulesPromptComponent: React.FC<PrePackagedRulesPromptProps> = ({
  createPrePackagedRules,
  loading = false,
  userHasNoPermissions = true,
}) => {
  const history = useHistory();
  const handlePreBuiltCreation = useCallback(() => {
    createPrePackagedRules();
  }, [createPrePackagedRules]);
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);

  const goToCreateRule = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getCreateRuleUrl());
    },
    [history]
  );

  const [
    { isSignalIndexExists, isAuthenticated, hasEncryptionKey, canUserCRUD, hasIndexWrite },
  ] = useUserData();

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
        isDisabled: userHasNoPermissions,
        onClick: handlePreBuiltCreation,
        fill: true,
        'data-test-subj': 'load-prebuilt-rules',
      }),
    [getLoadPrebuiltRulesAndTemplatesButton, handlePreBuiltCreation, userHasNoPermissions]
  );

  return (
    <EmptyPrompt
      title={<h2>{i18n.PRE_BUILT_TITLE}</h2>}
      body={<p>{i18n.PRE_BUILT_MSG}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>{loadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LinkButton
              isDisabled={userHasNoPermissions}
              onClick={goToCreateRule}
              href={formatUrl(getCreateRuleUrl())}
              iconType="plusInCircle"
            >
              {i18n.CREATE_RULE_ACTION}
            </LinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

export const PrePackagedRulesPrompt = memo(PrePackagedRulesPromptComponent);
