/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import React, { useState } from 'react';

export const CollapsibleSection = ({
  title,
  extraAction,
  children,
  shouldCollapse,
  ['data-test-subj']: dataTestSubj,
  id,
}: {
  title: React.FunctionComponent;
  extraAction?: React.ReactNode;
  dependsOn?: string[];
  children: React.ReactNode;
  shouldCollapse: boolean;
  ['data-test-subj']: string;
  id: string;
}) => {
  const [trigger, setTrigger] = useState<'closed' | 'open'>('open');

  const Title = title;
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
      buttonContent={<Title />}
      paddingSize="s"
      initialIsOpen={true}
      extraAction={extraAction ?? undefined}
      forceState={trigger}
      onToggle={onToggle}
      data-section-state={trigger}
      data-test-subj={dataTestSubj}
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
