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
    refreshInterval: PropTypes.number,
    setRefresh: PropTypes.func.isRequired,
    disableInterval: PropTypes.func.isRequired,
    doRefresh: PropTypes.func.isRequired,
  };

  refreshInput = null;

  render() {
    const { refreshInterval, setRefresh, doRefresh, disableInterval } = this.props;

    return (
      <div>
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="xs">
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.headerTitle"
                  defaultMessage="Refresh this page"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {refreshInterval > 0 ? (
                  <Fragment>
                    <span>
                      <FormattedMessage
                        id="xpack.canvas.refresh.control.frequencyDescriptionTitle"
                        defaultMessage="Every"
                      />
                      {timeDurationString(refreshInterval)}
                    </span>
                    <div>
                      <EuiLink size="s" onClick={disableInterval}>
                        <FormattedMessage
                          id="xpack.canvas.refresh.control.disableAutoRefreshLinkTitle"
                          defaultMessage="Disable auto-refresh"
                        />
                      </EuiLink>
                    </div>
                  </Fragment>
                ) : (
                  <span>
                    <FormattedMessage
                      id="xpack.canvas.refresh.control.refreshTypeTitle"
                      defaultMessage="Manually"
                    />
                  </span>
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill iconType="refresh" onClick={doRefresh}>
              <FormattedMessage
                id="xpack.canvas.refresh.control.refreshButtonTitle"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <EuiFormLabel>
          <FormattedMessage
            id="xpack.canvas.refresh.control.changeAutoRefreshIntervalLabel"
            defaultMessage="Change auto-refresh interval"
          />
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(5000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval5sButtonTitle"
                  defaultMessage="5 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(15000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval15sButtonTitle"
                  defaultMessage="15 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(30000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval30sButtonTitle"
                  defaultMessage="30 Seconds"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(60000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval1mButtonTitle"
                  defaultMessage="1 Minute"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(300000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval5mButtonTitle"
                  defaultMessage="5 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(900000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval15mButtonTitle"
                  defaultMessage="15 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(1800000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval30mButtonTitle"
                  defaultMessage="30 Minutes"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(3600000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval1hButtonTitle"
                  defaultMessage="1 Hour"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(7200000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval2hButtonTitle"
                  defaultMessage="2 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(21600000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval6hButtonTitle"
                  defaultMessage="6 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(43200000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval12hButtonTitle"
                  defaultMessage="12 Hours"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => setRefresh(86400000)}>
                <FormattedMessage
                  id="xpack.canvas.refresh.control.autoRefreshInterval24hButtonTitle"
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
                    id="xpack.canvas.refresh.control.customIntervalInputLabel"
                    defaultMessage="Set a custom intervale"
                  />
                }
                helpText={
                  <FormattedMessage
                    id="xpack.canvas.refresh.control.customIntervalInputDescriptionMessage"
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
                    id="xpack.canvas.refresh.control.setCustomAutoRefreshIntervalButtonTitle"
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
