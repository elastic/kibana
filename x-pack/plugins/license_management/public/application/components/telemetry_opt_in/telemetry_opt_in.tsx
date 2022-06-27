/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiLink,
  EuiCheckbox,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPopover,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TelemetryPluginStart } from '../../lib/telemetry';

const OptInExampleFlyout = React.lazy(() => import('./opt_in_example_flyout'));

interface State {
  showMoreTelemetryInfo: boolean;
  showExample: boolean;
}

interface Props {
  onOptInChange: (isOptingInToTelemetry: boolean) => void;
  isOptingInToTelemetry: boolean;
  isStartTrial: boolean;
  telemetry: TelemetryPluginStart;
}

export class TelemetryOptIn extends React.Component<Props, State> {
  state: State = {
    showMoreTelemetryInfo: false,
    showExample: false,
  };

  closeReadMorePopover = () => {
    this.setState({ showMoreTelemetryInfo: false });
  };
  onClickReadMore = () => {
    const { showMoreTelemetryInfo } = this.state;
    this.setState({ showMoreTelemetryInfo: !showMoreTelemetryInfo });
  };
  onClickExample = () => {
    this.setState({ showExample: true });
    this.closeReadMorePopover();
  };
  onChangeOptIn = (event: any) => {
    const isOptingInToTelemetry = event.target.checked;
    const { onOptInChange } = this.props;
    onOptInChange(isOptingInToTelemetry);
  };

  render() {
    const { showMoreTelemetryInfo, showExample } = this.state;
    const { isStartTrial, isOptingInToTelemetry, telemetry } = this.props;

    let example = null;
    if (showExample) {
      // Using React.Suspense and lazy loading here to avoid crashing the plugin when importing
      // OptInExampleFlyout but telemetryManagementSection is disabled
      example = (
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <OptInExampleFlyout
            onClose={() => this.setState({ showExample: false })}
            fetchExample={telemetry.telemetryService.fetchExample}
          />
        </React.Suspense>
      );
    }

    let toCurrentCustomers;
    if (!isStartTrial) {
      toCurrentCustomers = (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.licenseMgmt.telemetryOptIn.customersHelpSupportDescription"
                defaultMessage="Help Elastic support provide better service"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
        </Fragment>
      );
    }

    const readMoreButton = (
      <EuiLink onClick={this.onClickReadMore}>
        <FormattedMessage
          id="xpack.licenseMgmt.telemetryOptIn.readMoreLinkText"
          defaultMessage="Read more"
        />
      </EuiLink>
    );

    const popover = (
      <EuiPopover
        ownFocus
        id="readMorePopover"
        button={readMoreButton}
        isOpen={showMoreTelemetryInfo}
        closePopover={this.closeReadMorePopover}
        className="eui-AlignBaseline"
      >
        <EuiText className="licManagement__narrowText">
          <p>
            <FormattedMessage
              id="xpack.licenseMgmt.telemetryOptIn.featureUsageWarningMessage"
              defaultMessage="This feature periodically sends basic feature usage statistics.
              This information will not be shared outside of Elastic.
              See an {exampleLink} or read our {telemetryPrivacyStatementLink}.
              You can disable this feature any time."
              values={{
                exampleLink: (
                  <EuiLink onClick={this.onClickExample}>
                    <FormattedMessage
                      id="xpack.licenseMgmt.telemetryOptIn.exampleLinkText"
                      defaultMessage="example"
                    />
                  </EuiLink>
                ),
                telemetryPrivacyStatementLink: (
                  <EuiLink
                    href={telemetry.telemetryConstants.getPrivacyStatementUrl()}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.licenseMgmt.telemetryOptIn.telemetryPrivacyStatementLinkText"
                      defaultMessage="telemetry privacy statement"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiPopover>
    );

    return (
      <Fragment>
        {example}
        {toCurrentCustomers}
        <EuiCheckbox
          label={
            <span>
              <FormattedMessage
                id="xpack.licenseMgmt.telemetryOptIn.sendBasicFeatureStatisticsLabel"
                defaultMessage="Send basic feature usage statistics to Elastic periodically. {popover}"
                values={{
                  popover,
                }}
              />
            </span>
          }
          id="isOptingInToTelemetry"
          checked={isOptingInToTelemetry}
          onChange={this.onChangeOptIn}
        />
      </Fragment>
    );
  }
}
