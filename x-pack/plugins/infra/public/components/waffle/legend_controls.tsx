/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { SyntheticEvent, useState } from 'react';
import styled from 'styled-components';

interface Props {
  intl: InjectedIntl;
}

export const LegendControls = injectI18n(({ intl }: Props) => {
  const [isPopoverOpen, setPopoverState] = useState(true);
  const [isAuto, setAuto] = useState(true);
  const [draftBounds, setDraftBounds] = useState({ min: 0, max: 1 }); // should come from bounds prop
  const buttonComponent = (
    <EuiButtonIcon
      iconType="gear"
      color="text"
      aria-label={intl.formatMessage({
        id: 'xpack.infra.legendControls.buttonLabel',
        defaultMessage: 'configure legend',
      })}
      onClick={() => setPopoverState(true)}
    />
  );

  const handleChange = (e: SyntheticEvent<HTMLInputElement>) => {
    setAuto(e.currentTarget.checked);
  };

  const createBoundsHandler = (name: string) => (e: SyntheticEvent<HTMLInputElement>) => {
    setDraftBounds({ ...draftBounds, [name]: parseFloat(e.currentTarget.value) });
  };

  return (
    <ControlContainer>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverState(false)}
        id="legendControls"
        button={buttonComponent}
        anchorPosition="upLeft"
        withTitle
      >
        <EuiPopoverTitle>Legend Options</EuiPopoverTitle>
        <EuiFormRow label="Data Bounds">
          <EuiSwitch name="bounds" label="Automatic" checked={isAuto} onChange={handleChange} />
        </EuiFormRow>
        {!isAuto && (
          <EuiFlexGroup style={{ marginTop: 0 }}>
            <EuiFlexItem style={{ width: 80 }}>
              <EuiFormRow label="Lower">
                <EuiFieldNumber
                  value={draftBounds.min}
                  name="legendMin"
                  onChange={createBoundsHandler('min')}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: 80 }}>
              <EuiFormRow label="Upper">
                <EuiFieldNumber
                  value={draftBounds.max}
                  name="legendMax"
                  onChange={createBoundsHandler('max')}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPopover>
    </ControlContainer>
  );
});

const ControlContainer = styled.div`
  position: absolute;
  top: -20px;
  left: 6px;
  bottom: 0;
`;
