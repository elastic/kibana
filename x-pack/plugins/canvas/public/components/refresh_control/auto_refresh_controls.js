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
import { FormattedMessage } from '@kbn/i18n/react';
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
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.refreshPageTitle"
                  defaultMessage="Refresh this page"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <Fragment>
                    <span>
                      <FormattedMessage
                        id="xpack.canvas.refreshControl.refreshIntervalDescription"
                        defaultMessage="Every {timeDuration}"
                        values={{ timeDuration: timeDurationString(refreshInterval) }}
                      />
                    </span>
                    <div>
                      <EuiLink size="s" onClick={disableInterval}>
                        <FormattedMessage
                          id="xpack.canvas.refreshControl.disableAutoRefreshLinkText"
                          defaultMessage="Disable auto-refresh"
                        />
                      </EuiLink>
                    </div>
                  </Fragment>
                ) : (
                  <span>
                    <FormattedMessage
                      id="xpack.canvas.refreshControl.manualRefreshDescription"
                      defaultMessage="Manually"
                    />
                  </span>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill iconType="refresh" onClick={doRefresh} isDisabled={inFlight}>
              <FormattedMessage
                id="xpack.canvas.refreshControl.refreshButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiFormLabel>
          <FormattedMessage
            id="xpack.canvas.refreshControl.changeAutoRefreshIntervalFormLabel"
            defaultMessage="Change auto-refresh interval"
          />
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(5000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval5sButtonLabel"
                  defaultMessage="5 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(15000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval15sButtonLabel"
                  defaultMessage="15 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(30000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval30sButtonLabel"
                  defaultMessage="30 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(60000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval1mButtonLabel"
                  defaultMessage="1 Minute"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(300000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval5mButtonLabel"
                  defaultMessage="5 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(900000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval15mButtonLabel"
                  defaultMessage="15 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(1800000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval30mButtonLabel"
                  defaultMessage="30 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(3600000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval1hButtonLabel"
                  defaultMessage="1 Hour"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(7200000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval2hButtonLabel"
                  defaultMessage="2 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(21600000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval6hButtonLabel"
                  defaultMessage="6 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(43200000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval12hButtonLabel"
                  defaultMessage="12 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(86400000)}>
                <FormattedMessage
                  id="xpack.canvas.refreshControl.autoRefreshInterval24hButtonLabel"
                  defaultMessage="24 Hours"
                />
              </EuiLink>
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
                label={
                  <FormattedMessage
                    id="xpack.canvas.refreshControl.customIntervalFormRowLabel"
                    defaultMessage="Set a custom interval"
                  />
                }
                helpText={
                  <FormattedMessage
                    id="xpack.canvas.refreshControl.customIntervalFormRowHelpText"
                    defaultMessage="Use shorthand notation, like 30s, 10m, or 1h"
                  />
                }
                compressed
              >
                <EuiFieldText inputRef={i => (this.refreshInput = i)} />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label="&nbsp;">
                <EuiButton size="s" type="submit" style={{ minWidth: 'auto' }}>
                  <FormattedMessage
                    id="xpack.canvas.refreshControl.setCustomAutoRefreshIntervalButtonLabel"
                    defaultMessage="Set"
                  />
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </form>
      </div>
    );
  }
}
