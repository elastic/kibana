/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { INSTALL_PREBUILT_RULES_ANCHOR } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/rules_management_tour';
import * as i18n from './translations';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../../common';
import { usePrebuiltRulesStatus } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';

// TODO: Still need to load timeline templates

interface LoadPrePackagedRulesButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  onClick: () => Promise<void>;
  'data-test-subj'?: string;
  fill?: boolean;
  showBadge?: boolean;
}

export const LoadPrePackagedRulesButton = ({
  isDisabled,
  isLoading,
  onClick,
  'data-test-subj': dataTestSubj = 'loadPrebuiltRulesBtn',
  fill,
  showBadge = true,
}: LoadPrePackagedRulesButtonProps) => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { onClick: onClickLink } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rulesAdd,
  });

  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const newRulesCount = preBuiltRulesStatus?.attributes?.stats?.num_prebuilt_rules_to_install ?? 0;

  const ButtonComponent = fill ? EuiButton : EuiButtonEmpty;

  return (
    <ButtonComponent
      id={INSTALL_PREBUILT_RULES_ANCHOR}
      fill={fill}
      iconType="plusInCircle"
      isLoading={isLoading}
      isDisabled={isDisabled}
      color={'primary'}
      onClick={onClickLink}
      data-test-subj={dataTestSubj}
    >
      {i18n.ADD_ELASTIC_RULES}
      {newRulesCount > 0 && showBadge && (
        <EuiBadge
          color={'#E0E5EE'}
          css={css`
            margin-left: 5px;
          `}
        >
          {newRulesCount}
        </EuiBadge>
      )}
    </ButtonComponent>
  );
};
