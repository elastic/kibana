/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { noop } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import { Rule, exportRules } from '../../../containers/detection_engine/rules';
import * as i18n from './translations';
import * as i18nActions from '../../../pages/detection_engine/rules/translations';
import { displaySuccessToast, useStateToaster } from '../../../../common/components/toasters';
import {
  deleteRulesAction,
  duplicateRulesAction,
} from '../../../pages/detection_engine/rules/all/actions';
import { GenericDownloader } from '../../../../common/components/generic_downloader';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

const MyEuiButtonIcon = styled(EuiButtonIcon)`
  &.euiButtonIcon {
    svg {
      transform: rotate(90deg);
    }
    border: 1px solid  ${({ theme }) => theme.euiColorPrimary};
    width: 40px;
    height: 40px;
  }
`;

interface RuleActionsOverflowComponentProps {
  rule: Rule | null;
  userHasNoPermissions: boolean;
}

/**
 * Overflow Actions for a Rule
 */
const RuleActionsOverflowComponent = ({
  rule,
  userHasNoPermissions,
}: RuleActionsOverflowComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [rulesToExport, setRulesToExport] = useState<string[]>([]);
  const history = useHistory();
  const [, dispatchToaster] = useStateToaster();

  const onRuleDeletedCallback = useCallback(() => {
    history.push(getRulesUrl());
  }, [history]);

  const actions = useMemo(
    () =>
      rule != null
        ? [
            <EuiContextMenuItem
              key={i18nActions.DUPLICATE_RULE}
              icon="copy"
              disabled={userHasNoPermissions}
              data-test-subj="rules-details-duplicate-rule"
              onClick={async () => {
                setIsPopoverOpen(false);
                await duplicateRulesAction([rule], [rule.id], noop, dispatchToaster);
              }}
            >
              {i18nActions.DUPLICATE_RULE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.EXPORT_RULE}
              icon="exportAction"
              disabled={userHasNoPermissions || rule.immutable}
              data-test-subj="rules-details-export-rule"
              onClick={() => {
                setIsPopoverOpen(false);
                setRulesToExport([rule.rule_id]);
              }}
            >
              {i18nActions.EXPORT_RULE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={i18nActions.DELETE_RULE}
              icon="trash"
              disabled={userHasNoPermissions}
              data-test-subj="rules-details-delete-rule"
              onClick={async () => {
                setIsPopoverOpen(false);
                await deleteRulesAction([rule.id], noop, dispatchToaster, onRuleDeletedCallback);
              }}
            >
              {i18nActions.DELETE_RULE}
            </EuiContextMenuItem>,
          ]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rule, userHasNoPermissions]
  );

  const handlePopoverOpen = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [setIsPopoverOpen, isPopoverOpen]);

  const button = useMemo(
    () => (
      <EuiToolTip position="top" content={i18n.ALL_ACTIONS}>
        <MyEuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.ALL_ACTIONS}
          isDisabled={userHasNoPermissions}
          data-test-subj="rules-details-popover-button-icon"
          onClick={handlePopoverOpen}
        />
      </EuiToolTip>
    ),
    [handlePopoverOpen, userHasNoPermissions]
  );

  return (
    <>
      <EuiPopover
        anchorPosition="leftCenter"
        button={button}
        closePopover={() => setIsPopoverOpen(false)}
        id="ruleActionsOverflow"
        isOpen={isPopoverOpen}
        data-test-subj="rules-details-popover"
        ownFocus={true}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiContextMenuPanel data-test-subj="rules-details-menu-panel" items={actions} />
      </EuiPopover>
      <GenericDownloader
        filename={`${i18nActions.EXPORT_FILENAME}.ndjson`}
        ids={rulesToExport}
        exportSelectedData={exportRules}
        data-test-subj="rules-details-generic-downloader"
        onExportSuccess={(exportCount) => {
          displaySuccessToast(
            i18nActions.SUCCESSFULLY_EXPORTED_RULES(exportCount),
            dispatchToaster
          );
        }}
      />
    </>
  );
};

export const RuleActionsOverflow = React.memo(RuleActionsOverflowComponent);

RuleActionsOverflow.displayName = 'RuleActionsOverflow';
