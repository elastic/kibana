/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { timeDurationString } from '../../../lib/time_duration';
import { CustomInterval } from './custom_interval';

const ListGroup = ({ children }) => <ul style={{ listStyle: 'none', margin: 0 }}>{[children]}</ul>;

export const KioskControls = ({
  autoplayEnabled,
  autoplayInterval,
  onSetEnabled,
  onSetInterval,
}) => {
  const RefreshItem = ({ duration, label }) => (
    <li>
      <EuiLink onClick={() => onSetInterval(duration)}>{label}</EuiLink>
    </li>
  );

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiDescriptionList textStyle="reverse">
          <EuiDescriptionListTitle>Cycle fullscreen pages</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <span>Every {timeDurationString(autoplayInterval)}</span>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
        <EuiHorizontalRule margin="m" />

        <div>
          <EuiSwitch
            checked={autoplayEnabled}
            label="Cycle slides automatically"
            onChange={ev => onSetEnabled(ev.target.checked)}
          />
          <EuiSpacer size="m" />
        </div>

        <EuiFormLabel>Change cycling interval</EuiFormLabel>
        <EuiSpacer size="s" />

        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="5000" label="5 seconds" />
                <RefreshItem duration="10000" label="10 seconds" />
                <RefreshItem duration="30000" label="30 seconds" />
              </ListGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="60000" label="1 minute" />
                <RefreshItem duration="300000" label="5 minutes" />
                <RefreshItem duration="900000" label="15 minute" />
              </ListGroup>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CustomInterval onSubmit={value => onSetInterval(value)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

KioskControls.propTypes = {
  autoplayEnabled: PropTypes.bool.isRequired,
  autoplayInterval: PropTypes.number.isRequired,
  onSetEnabled: PropTypes.func.isRequired,
  onSetInterval: PropTypes.func.isRequired,
};
