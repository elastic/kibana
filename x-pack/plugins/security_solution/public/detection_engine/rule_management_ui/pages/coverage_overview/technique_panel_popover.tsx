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
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { getCoveredSubtechniques } from './helpers';
import { CoverageOverviewRuleListHeader } from './shared_components';
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
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const coveredSubtechniques = useMemo(() => getCoveredSubtechniques(technique), [technique]);

  const TechniquePanel = useMemo(
    () => (
      <CoverageOverviewMitreTechniquePanel
        setIsPopoverOpen={setIsPopoverOpen}
        isPopoverOpen={isPopoverOpen}
        technique={technique}
        isExpanded={isExpanded}
        coveredSubtechniques={coveredSubtechniques}
      />
    ),
    [technique, isPopoverOpen, isExpanded, coveredSubtechniques]
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
        onClick: () => {},
      })),
    [technique.enabledRules]
  );

  const disabledRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.disabledRules.map((rule) => ({
        label: rule.name,
        color: 'primary',
        showToolTip: true,
        onClick: () => {},
      })),
    [technique.disabledRules]
  );

  const availableRuleListItems: EuiListGroupItemProps[] = useMemo(
    () =>
      technique.availableRules.map((rule) => ({
        label: rule.name,
        color: 'primary',
        showToolTip: true,
        onClick: () => {},
      })),
    [technique.availableRules]
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

  const AvailableRulesAccordionButton = useMemo(
    () => (
      <CoverageOverviewRuleListHeader
        listTitle={i18n.AVAILABLE_RULES_LIST_LABEL}
        listLength={technique.availableRules.length}
      />
    ),
    [technique.availableRules.length]
  );

  return (
    <EuiPopover
      button={TechniquePanel}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
      style={{ maxHeight: '500px' }}
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
      <div className="eui-yScrollWithShadows" style={{ maxHeight: '700px', padding: '5px 0px' }}>
        <EuiAccordion
          id="enabledRulesListAccordion"
          initialIsOpen={technique.enabledRules.length > 0}
          buttonContent={EnabledRulesAccordionButton}
        >
          <EuiListGroup flush listItems={enabledRuleListItems} size="s" />
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion
          id="disabledRulesListAccordion"
          initialIsOpen={technique.disabledRules.length > 0}
          buttonContent={DisabledRulesAccordionButton}
        >
          <EuiListGroup flush listItems={disabledRuleListItems} size="s" />
        </EuiAccordion>
        <EuiSpacer size="s" />
        <EuiAccordion
          id="availableRulesListAccordion"
          initialIsOpen={technique.availableRules.length > 0}
          buttonContent={AvailableRulesAccordionButton}
        >
          <EuiListGroup flush listItems={availableRuleListItems} size="s" />
        </EuiAccordion>
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton size="s" fill iconType="plusInCircle">
              {i18n.INSTALL_ALL_AVAILABLE}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton size="s" iconType="checkInCircleFilled">
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
