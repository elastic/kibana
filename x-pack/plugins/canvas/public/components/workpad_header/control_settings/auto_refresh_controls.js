/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiLink,
  EuiFieldText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFormLabel,
  EuiText,
} from '@elastic/eui';
import { timeDurationString } from '../../../lib/time_duration';
import { RefreshControl } from '../refresh_control';

const ListGroup = ({ children }) => <ul style={{ listStyle: 'none', margin: 0 }}>{[children]}</ul>;

export class AutoRefreshControls extends Component {
  static propTypes = {
    refreshInterval: PropTypes.number,
    setRefresh: PropTypes.func.isRequired,
    disableInterval: PropTypes.func.isRequired,
  };

  refreshInput = null;

  render() {
    const { refreshInterval, setRefresh, disableInterval } = this.props;

    const RefreshItem = ({ duration, label }) => (
      <li>
        <EuiLink onClick={() => setRefresh(duration)}>{label}</EuiLink>
      </li>
    );

    return (
      <div>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>Refresh elements</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <Fragment>
                    <span>Every {timeDurationString(refreshInterval)}</span>
                    <div>
                      <EuiLink size="s" onClick={disableInterval}>
                        Disable auto-refresh
                      </EuiLink>
                    </div>
                  </Fragment>
                ) : (
                  <span>Manually</span>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RefreshControl />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiFormLabel>Change auto-refresh interval</EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="5000" label="5 seconds" />
                <RefreshItem duration="15000" label="15 seconds" />
                <RefreshItem duration="30000" label="30 seconds" />
                <RefreshItem duration="60000" label="1 minute" />
                <RefreshItem duration="300000" label="5 minutes" />
                <RefreshItem duration="900000" label="15 minute" />
              </ListGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListGroup>
                <RefreshItem duration="1800000" label="30 Minutes" />
                <RefreshItem duration="3600000" label="1 Hour" />
                <RefreshItem duration="7200000" label="2 Hours" />
                <RefreshItem duration="21600000" label="6 Hours" />
                <RefreshItem duration="43200000" label="12 Hours" />
                <RefreshItem duration="86400000" label="24 Hours" />
              </ListGroup>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>

        <EuiSpacer size="m" />

        <form
          onSubmit={ev => {
            ev.preventDefault();
            setRefresh(this.refreshInput.value);
          }}
        >
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFormRow
                label="Set a custom interval"
                helpText="Use shorthand notation, like 30s, 10m, or 1h"
                compressed
              >
                <EuiFieldText inputRef={i => (this.refreshInput = i)} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="&nbsp;">
                <EuiButton size="s" type="submit" style={{ minWidth: 'auto' }}>
                  Set
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </form>
      </div>
    );
  }
}
