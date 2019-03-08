/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { kfetch } from 'ui/kfetch';
import { LoadingState } from '../../../../types';

interface FixDefaultFieldsButtonProps {
  indexName: string;
}

interface FixDefaultFieldsButtonState {
  isMetrecbeatLoadingState: LoadingState;
  isMetricbeatIndex?: boolean;
  fixLoadingState?: LoadingState;
}

/**
 * Renders a button if given index is a valid Metricbeat index to repair its default_fieldssetting.
 */
export class FixDefaultFieldsButton extends React.Component<
  FixDefaultFieldsButtonProps,
  FixDefaultFieldsButtonState
> {
  constructor(props: FixDefaultFieldsButtonProps) {
    super(props);

    this.state = {
      isMetrecbeatLoadingState: LoadingState.Loading,
    };
  }

  public async componentDidMount() {
    this.loadIsMetricbeatIndex();
  }

  public componentDidUpdate(prevProps: FixDefaultFieldsButtonProps) {
    if (prevProps.indexName !== this.props.indexName) {
      this.loadIsMetricbeatIndex();
    }
  }

  public render() {
    const { isMetricbeatIndex, fixLoadingState } = this.state;

    if (!isMetricbeatIndex) {
      return null;
    }

    const buttonProps: any = { size: 's', onClick: this.fixMetricbeatIndex };
    let buttonContent: ReactNode;

    switch (fixLoadingState) {
      case LoadingState.Loading:
        buttonProps.disabled = true;
        buttonProps.isLoading = true;
        buttonContent = (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.fixMetricbeatIndexButton.fixingLabel"
            defaultMessage="Fixing…"
          />
        );
        break;
      case LoadingState.Success:
        buttonProps.iconSide = 'left';
        buttonProps.iconType = 'check';
        buttonProps.disabled = true;
        buttonContent = (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.fixMetricbeatIndexButton.fixedLabel"
            defaultMessage="Fixed"
          />
        );
        break;
      case LoadingState.Error:
        buttonProps.color = 'danger';
        buttonProps.iconSide = 'left';
        buttonProps.iconType = 'cross';
        buttonContent = (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.fixMetricbeatIndexButton.failedLabel"
            defaultMessage="Failed"
          />
        );
        break;
      default:
        buttonContent = (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.fixMetricbeatIndexButton.reindexLabel"
            defaultMessage="Fix"
          />
        );
    }

    return <EuiButton {...buttonProps}>{buttonContent}</EuiButton>;
  }

  private loadIsMetricbeatIndex = async () => {
    this.setState({
      isMetrecbeatLoadingState: LoadingState.Loading,
      isMetricbeatIndex: undefined,
      fixLoadingState: undefined,
    });

    try {
      const isMetricbeatIndex = await kfetch({
        pathname: `/api/upgrade_assistant/metricbeat/${this.props.indexName}`,
        method: 'GET',
      });

      this.setState({
        isMetrecbeatLoadingState: LoadingState.Success,
        isMetricbeatIndex,
      });
    } catch (e) {
      this.setState({
        isMetrecbeatLoadingState: LoadingState.Error,
      });
    }
  };

  private fixMetricbeatIndex = async () => {
    if (!this.state.isMetricbeatIndex) {
      return;
    }

    this.setState({
      fixLoadingState: LoadingState.Loading,
    });

    try {
      await kfetch({
        pathname: `/api/upgrade_assistant/metricbeat/${this.props.indexName}/fix`,
        method: 'POST',
      });

      this.setState({
        fixLoadingState: LoadingState.Success,
      });
    } catch (e) {
      this.setState({
        fixLoadingState: LoadingState.Error,
      });
    }
  };
}
