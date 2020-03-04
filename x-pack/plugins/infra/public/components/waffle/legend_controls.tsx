/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { SyntheticEvent, useState } from 'react';

import { euiStyled } from '../../../../observability/public';
import { InfraWaffleMapBounds } from '../../lib/lib';

interface Props {
  onChange: (options: { auto: boolean; bounds: InfraWaffleMapBounds }) => void;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  autoBounds: boolean;
  boundsOverride: InfraWaffleMapBounds;
}

export const LegendControls = ({ autoBounds, boundsOverride, onChange, dataBounds }: Props) => {
  const [isPopoverOpen, setPopoverState] = useState(false);
  const [draftAuto, setDraftAuto] = useState(autoBounds);
  const [draftBounds, setDraftBounds] = useState(autoBounds ? dataBounds : boundsOverride); // should come from bounds prop
  const buttonComponent = (
    <EuiButtonIcon
      iconType="gear"
      color="text"
      aria-label={i18n.translate('xpack.infra.legendControls.buttonLabel', {
        defaultMessage: 'configure legend',
      })}
      onClick={() => setPopoverState(true)}
    />
  );

  const handleAutoChange = (e: EuiSwitchEvent) => {
    setDraftAuto(e.target.checked);
  };

  const createBoundsHandler = (name: string) => (e: SyntheticEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    setDraftBounds({ ...draftBounds, [name]: value });
  };

  const handlePopoverClose = () => {
    setPopoverState(false);
  };

  const handleApplyClick = () => {
    onChange({ auto: draftAuto, bounds: draftBounds });
  };

  const commited =
    draftAuto === autoBounds &&
    boundsOverride.min === draftBounds.min &&
    boundsOverride.max === draftBounds.max;

  const boundsValidRange = draftBounds.min < draftBounds.max;

  return (
    <ControlContainer>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={handlePopoverClose}
        id="legendControls"
        button={buttonComponent}
        withTitle
      >
        <EuiPopoverTitle>Legend Options</EuiPopoverTitle>
        <EuiForm>
          <EuiFormRow>
            <EuiSwitch
              name="bounds"
              label={i18n.translate('xpack.infra.legendControls.switchLabel', {
                defaultMessage: 'Auto calculate range',
              })}
              checked={draftAuto}
              onChange={handleAutoChange}
            />
          </EuiFormRow>
          <EuiSpacer />
          {(!boundsValidRange && (
            <EuiText color="danger" grow={false} size="s">
              <p>
                <FormattedMessage
                  id="xpack.infra.legendControls.errorMessage"
                  defaultMessage="Min should be less than max"
                />
              </p>
            </EuiText>
          )) ||
            null}
          <EuiFlexGroup style={{ marginTop: 0 }}>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.infra.legendControls.minLabel', {
                  defaultMessage: 'Min',
                })}
                isInvalid={!boundsValidRange}
              >
                <EuiFieldNumber
                  disabled={draftAuto}
                  step={0.1}
                  value={isNaN(draftBounds.min) ? '' : draftBounds.min}
                  isInvalid={!boundsValidRange}
                  name="legendMin"
                  onChange={createBoundsHandler('min')}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.infra.legendControls.maxLabel', {
                  defaultMessage: 'Max',
                })}
                isInvalid={!boundsValidRange}
              >
                <EuiFieldNumber
                  disabled={draftAuto}
                  step={0.1}
                  isInvalid={!boundsValidRange}
                  value={isNaN(draftBounds.max) ? '' : draftBounds.max}
                  name="legendMax"
                  onChange={createBoundsHandler('max')}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiButton
            type="submit"
            size="s"
            fill
            disabled={commited || !boundsValidRange}
            onClick={handleApplyClick}
          >
            <FormattedMessage id="xpack.infra.legendControls.applyButton" defaultMessage="Apply" />
          </EuiButton>
        </EuiForm>
      </EuiPopover>
    </ControlContainer>
  );
};

const ControlContainer = euiStyled.div`
  position: absolute;
  top: -20px;
  right: 6px;
  bottom: 0;
`;
