/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCheckbox,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useRulesTableContext } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';

interface PublishExternalRulesButtonProps {
  'data-test-subj'?: string;
  fill?: boolean;
  isDisabled: boolean;
  showBadge?: boolean;
}

export const PublishExternalRulesButton = ({
  'data-test-subj': dataTestSubj = 'publishExternalRulesButton',
  fill,
  isDisabled,
  showBadge = true,
}: PublishExternalRulesButtonProps) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const {
    state: { publishableRules },
  } = useRulesTableContext();

  const publishableRulesCount = publishableRules.length;

  if (publishableRulesCount === 0) {
    return null;
  }

  const openFlyout = () => setIsFlyoutVisible(true);
  const closeFlyout = () => setIsFlyoutVisible(false);

  const handleRuleSelection = (ruleId: string) => {
    setSelectedRules((prevSelected) =>
      prevSelected.includes(ruleId)
        ? prevSelected.filter((id) => id !== ruleId)
        : [...prevSelected, ruleId]
    );
  };

  const handlePublishSelected = () => {
    console.log('Publishing rules:', selectedRules);
    closeFlyout();
  };

  const ButtonComponent = fill ? EuiButton : EuiButtonEmpty;

  return (
    <>
      <ButtonComponent
        fill={fill}
        iconType="plusInCircle"
        color={'primary'}
        onClick={openFlyout}
        data-test-subj={dataTestSubj}
        isDisabled={isDisabled}
      >
        {i18n.PUBLISH_EXTERNAL_RULES}
        {publishableRulesCount > 0 && showBadge && (
          <EuiBadge
            color={'#E0E5EE'}
            css={css`
              margin-left: 5px;
            `}
          >
            {publishableRulesCount}
          </EuiBadge>
        )}
      </ButtonComponent>

      {isFlyoutVisible && (
        <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutTitle">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">Publish Rules</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {publishableRules.map((rule) => (
              <EuiCheckbox
                id={rule.rule_id}
                key={rule.rule_id}
                label={rule.rule_id}
                checked={selectedRules.includes(rule.rule_id)}
                onChange={() => handleRuleSelection(rule.rule_id)}
              />
            ))}
            <EuiSpacer />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={handlePublishSelected}
                  disabled={selectedRules.length === 0}
                >
                  Publish Selected
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
