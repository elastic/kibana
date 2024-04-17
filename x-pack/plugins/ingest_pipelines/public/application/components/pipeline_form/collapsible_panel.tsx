/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiSwitch,
  EuiPanel,
  EuiAccordion,
  useGeneratedHtmlId,
  EuiSwitchEvent,
} from '@elastic/eui';

interface ChildrenFn {
  isEnabled: boolean;
}

interface Props {
  title: ReactNode | string;
  initialToggleState: boolean;
  children: (options: ChildrenFn) => ReactNode;
}

type AccordionStatus = 'open' | 'closed';

export const CollapsiblePanel: React.FunctionComponent<Props> = ({
  title,
  initialToggleState,
  children,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'CollapsiblerPanel' });
  const [isEnabled, setIsEnabled] = useState<boolean>(initialToggleState);
  const [trigger, setTrigger] = useState<AccordionStatus>(isEnabled ? 'open' : 'closed');

  const onToggleChange = (e: EuiSwitchEvent) => {
    const isChecked = !!e.target.checked;

    setIsEnabled(isChecked);
    setTrigger(isChecked ? 'open' : 'closed');
  };

  const onAccordionToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  const extraAction = (
    <EuiSwitch
      label={
        <FormattedMessage
          id="xpack.ingestPipelines.collapsiblePanelToggle"
          defaultMessage="Enabled"
        />
      }
      checked={isEnabled}
      onChange={onToggleChange}
      data-test-subj="versionToggle"
    />
  );

  return (
    <EuiPanel hasShadow={false} hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        onToggle={onAccordionToggle}
        forceState={trigger}
        buttonContent={title}
        extraAction={extraAction}
      >
        <EuiSpacer size="l" />
        {children({ isEnabled })}
      </EuiAccordion>
    </EuiPanel>
  );
};
