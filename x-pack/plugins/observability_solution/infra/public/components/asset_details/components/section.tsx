/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
  type EuiAccordionProps,
} from '@elastic/eui';

interface Props {
  title: React.ReactNode;
  closedSectionContent?: React.ReactNode;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  ['data-test-subj']: string;
  id: string;
  initialTriggerValue?: EuiAccordionProps['forceState'];
}

export const Section = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      title,
      closedSectionContent,
      extraAction,
      children,
      collapsible = false,
      ['data-test-subj']: dataTestSubj,
      id,
      initialTriggerValue,
    },
    ref
  ) => {
    const [trigger, setTrigger] = useState<EuiAccordionProps['forceState']>('open');

    useEffect(() => {
      setTrigger(initialTriggerValue ?? 'open');
    }, [initialTriggerValue]);

    const ButtonContent = () =>
      closedSectionContent && trigger === 'closed' ? (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>{closedSectionContent}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>{title}</>
      );
    const collapsibleSectionAccordionId = useGeneratedHtmlId({
      prefix: id,
    });

    const onToggle = (isOpen: boolean) => {
      const newState = isOpen ? 'open' : 'closed';
      setTrigger(newState);
    };

    return collapsible ? (
      <div ref={ref}>
        <EuiAccordion
          id={collapsibleSectionAccordionId}
          data-section-id={id}
          buttonElement="div"
          element="fieldset"
          buttonContent={<ButtonContent />}
          buttonProps={{ 'data-test-subj': dataTestSubj }}
          paddingSize="s"
          initialIsOpen
          extraAction={extraAction}
          forceState={trigger}
          onToggle={onToggle}
          data-section-state={trigger}
          data-test-subj="infraAssetDetailsCollapseExpandSection"
        >
          {children}
        </EuiAccordion>
      </div>
    ) : (
      <EuiFlexGroup
        id={collapsibleSectionAccordionId}
        data-section-id={id}
        data-test-subj={dataTestSubj}
        gutterSize="m"
        direction="column"
        ref={ref}
      >
        <EuiFlexGroup gutterSize="m" responsive={false}>
          <EuiFlexItem grow>{title}</EuiFlexItem>
          {extraAction && <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem>}
        </EuiFlexGroup>
        {React.Children.toArray(children).filter(Boolean).length > 0 ? (
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);
