/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

export type SectionTriggerValue = 'closed' | 'open';

export const CollapsibleSection = ({
  title,
  closedSectionContent,
  extraAction,
  children,
  shouldCollapse,
  ['data-test-subj']: dataTestSubj,
  id,
  initialTriggerValue,
}: {
  title: React.FunctionComponent;
  closedSectionContent?: React.ReactNode;
  extraAction?: React.ReactNode;
  dependsOn?: string[];
  children: React.ReactNode;
  shouldCollapse: boolean;
  ['data-test-subj']: string;
  id: string;
  initialTriggerValue?: SectionTriggerValue;
}) => {
  const [trigger, setTrigger] = useState<SectionTriggerValue>('open');

  useEffect(() => {
    setTrigger(initialTriggerValue ?? 'open');
  }, [initialTriggerValue]);

  const Title = title;
  const ButtonContent = () =>
    closedSectionContent && trigger === 'closed' ? (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <>
            <Title />
          </>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{closedSectionContent}</EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <Title />
    );
  const collapsibleSectionAccordionId = useGeneratedHtmlId({
    prefix: id,
  });

  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  return shouldCollapse ? (
    <EuiAccordion
      id={collapsibleSectionAccordionId}
      data-section-id={id}
      buttonElement="div"
      element="fieldset"
      buttonContent={<ButtonContent />}
      buttonProps={{ 'data-test-subj': dataTestSubj }}
      paddingSize="s"
      initialIsOpen={true}
      extraAction={extraAction ?? undefined}
      forceState={trigger}
      onToggle={onToggle}
      data-section-state={trigger}
      data-test-subj="infraAssetDetailsCollapseExpandSection"
    >
      {children}
    </EuiAccordion>
  ) : (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem grow={false}>
        <Title />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
