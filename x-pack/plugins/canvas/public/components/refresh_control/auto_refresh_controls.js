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
import { timeDurationString } from '../../lib/time_duration';

export class AutoRefreshControls extends Component {
  static propTypes = {
    inFlight: PropTypes.bool.isRequired,
    refreshInterval: PropTypes.number,
    setRefresh: PropTypes.func.isRequired,
    disableInterval: PropTypes.func.isRequired,
    doRefresh: PropTypes.func.isRequired,
  };

  refreshInput = null;

  render() {
    const { inFlight, refreshInterval, setRefresh, doRefresh, disableInterval } = this.props;

    return (
      <div>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>Refresh this page</EuiDescriptionListTitle>
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
            <EuiButton size="s" fill iconType="refresh" onClick={doRefresh} isDisabled={inFlight}>
              Refresh
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiFormLabel>Change auto-refresh interval</EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(5000)}>5 Seconds</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(15000)}>15 Seconds</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(30000)}>30 Seconds</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(60000)}>1 Minute</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(300000)}>5 Minutes</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(900000)}>15 Minutes</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(1800000)}>30 Minutes</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(3600000)}>1 Hour</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(7200000)}>2 Hours</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(21600000)}>6 Hours</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(43200000)}>12 Hours</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(86400000)}>24 Hours</EuiLink>
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
