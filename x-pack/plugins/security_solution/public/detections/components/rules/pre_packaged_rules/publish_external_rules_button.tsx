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
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { usePublishRules } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_publish_rules';
import type { RuleResponse, RuleSignatureId } from '../../../../../common/api/detection_engine';
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
  const [selectedRules, setSelectedRules] = useState<Map<RuleSignatureId, RuleResponse>>(new Map());
  const {
    state: { publishableRules },
  } = useRulesTableContext();
  const { mutateAsync: publishRulesRequest } = usePublishRules();

  const publishableRulesCount = publishableRules.length;
  if (publishableRulesCount === 0) {
    return null;
  }

  const openFlyout = () => setIsFlyoutVisible(true);
  const closeFlyout = () => setIsFlyoutVisible(false);

  const handleRuleSelection = (rule: RuleResponse) =>
    setSelectedRules((prevSelected) => {
      if (prevSelected.has(rule.rule_id)) {
        prevSelected.delete(rule.rule_id);
      } else {
        prevSelected.set(rule.rule_id, rule);
      }
      return new Map(prevSelected);
    });

  const handlePublishSelected = async () => {
    await publishRulesRequest({
      rules: Array.from(selectedRules.values()).map((rule) => ({
        rule_id: rule.rule_id,
        revision: rule.revision,
      })),
    });
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
              <h2 id="flyoutTitle">{`Publish Rules`}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {publishableRules.map((rule) => (
              <>
                <EuiCheckbox
                  id={rule.rule_id}
                  key={rule.rule_id}
                  label={<RuleLabelItem rule={rule} />}
                  checked={selectedRules.has(rule.rule_id)}
                  onChange={() => handleRuleSelection(rule)}
                />
                <EuiSpacer size="m" />
              </>
            ))}
            <EuiSpacer />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeFlyout}>{`Cancel`}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handlePublishSelected} disabled={selectedRules.size === 0}>
                  <p>{`Publish`}</p>
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

interface RuleLabelItemProps {
  rule: RuleResponse;
}

const RuleLabelItem = ({ rule }: RuleLabelItemProps) => {
  const { name, rule_id: ruleId, version, rule_source: ruleSource } = rule;

  const repositoryId = ruleSource && ruleSource.type === 'external' && ruleSource.repository_id;
  return (
    <EuiFlexGroup key={rule.rule_id} direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText>{name}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        {`Rule Id:`} {ruleId}
      </EuiFlexItem>
      <EuiFlexItem>
        {`Upgrade to version: `}
        {version + 1}
      </EuiFlexItem>
      <EuiFlexItem>
        {`Repository Id:`} {repositoryId}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
