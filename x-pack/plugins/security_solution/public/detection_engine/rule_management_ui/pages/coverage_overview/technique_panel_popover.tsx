/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiSpacer,
  EuiAccordion,
} from '@elastic/eui';
import { css, cx } from '@emotion/css';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { BulkActionType } from '../../../../../common/api/detection_engine';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { getNumOfCoveredSubtechniques } from './helpers';
import { CoverageOverviewRuleListHeader } from './shared_components/popover_list_header';
import { CoverageOverviewMitreTechniquePanel } from './technique_panel';
import * as i18n from './translations';

export interface CoverageOverviewMitreTechniquePanelPopoverProps {
  technique: CoverageOverviewMitreTechnique;
  isExpanded: boolean;
}

const CoverageOverviewMitreTechniquePanelPopoverComponent = ({
  technique,
  isExpanded,
}: CoverageOverviewMitreTechniquePanelPopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isEnableButtonLoading, setIsDisableButtonLoading] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const coveredSubtechniques = useMemo(() => getNumOfCoveredSubtechniques(technique), [technique]);
  const { executeBulkAction } = useExecuteBulkAction();
  const isEnableButtonDisabled = useMemo(
    () => technique.disabledRules.length === 0,
    [technique.disabledRules.length]
  );

  const handleEnableAllDisabled = useCallback(async () => {
    setIsDisableButtonLoading(true);
    const ruleIds = technique.disabledRules.map((rule) => rule.id);
    await executeBulkAction({ type: BulkActionType.enable, ids: ruleIds });
    setIsDisableButtonLoading(false);
    closePopover();
  }, [closePopover, executeBulkAction, technique.disabledRules]);

  const TechniquePanel = (
    <CoverageOverviewMitreTechniquePanel
      setIsPopoverOpen={setIsPopoverOpen}
      isPopoverOpen={isPopoverOpen}
      technique={technique}
      isExpanded={isExpanded}
      coveredSubtechniques={coveredSubtechniques}
    />
  );
  const CoveredSubtechniquesLabel = useMemo(
    () => (
      <EuiText color="success" size="s">
        <h4>
          {i18n.COVERED_MITRE_SUBTECHNIQUES(coveredSubtechniques, technique.subtechniques.length)}
        </h4>
      </EuiText>
    ),
    [coveredSubtechniques, technique.subtechniques.length]
  );

  const enabledRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.enabledRules.map((rule) => ({
        label: rule.name,
        color: 'primary',
        showToolTip: true,
      })),
    [technique.enabledRules]
  );

  const disabledRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.disabledRules.map((rule) => ({
        label: rule.name,
        color: 'primary',
        showToolTip: true,
      })),
    [technique.disabledRules]
  );

  const EnabledRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.ENABLED_RULES_LIST_LABEL}
        listLength={technique.enabledRules.length}
      />
    ),
    [technique.enabledRules.length]
  );

  const DisabledRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.DISABLED_RULES_LIST_LABEL}
        listLength={technique.disabledRules.length}
      />
    ),
    [technique.disabledRules.length]
  );

  return (
    <EuiPopover
      button={TechniquePanel}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
      data-test-subj="coverageOverviewPopover"
      ownFocus={false}
    >
      <EuiPopoverTitle>
        <EuiFlexGroup gutterSize="xs" alignItems="flexStart" direction="column">
          <EuiFlexItem>
            <EuiButtonEmpty
              flush="left"
              iconType="popout"
              iconSide="right"
              href={technique.reference}
              target="_blank"
            >
              <EuiText>
                <h3>{technique.name}</h3>
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>{CoveredSubtechniquesLabel}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div className={cx(css({ maxHeight: '40em', padding: '5px 0px' }), 'eui-yScrollWithShadows')}>
        <EuiAccordion
          id="enabledRulesListAccordion"
          initialIsOpen={technique.enabledRules.length > 0}
          buttonContent={EnabledRulesAccordionButton}
        >
          <EuiListGroup
            data-test-subj="coverageOverviewEnabledRulesList"
            flush
            listItems={enabledRuleListItems}
            size="s"
          />
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion
          id="disabledRulesListAccordion"
          initialIsOpen={technique.disabledRules.length > 0}
          buttonContent={DisabledRulesAccordionButton}
        >
          <EuiListGroup
            data-test-subj="coverageOverviewDisabledRulesList"
            flush
            listItems={disabledRuleListItems}
            size="s"
          />
        </EuiAccordion>
        <EuiSpacer size="s" />
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              isLoading={isEnableButtonLoading}
              disabled={isEnableButtonDisabled}
              onClick={handleEnableAllDisabled}
              size="s"
              iconType="checkInCircleFilled"
            >
              {i18n.ENABLE_ALL_DISABLED}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const CoverageOverviewMitreTechniquePanelPopover = memo(
  CoverageOverviewMitreTechniquePanelPopoverComponent
);
