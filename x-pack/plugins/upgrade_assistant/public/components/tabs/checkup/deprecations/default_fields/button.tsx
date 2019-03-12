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

/**
 * Field types used by Metricbeat to generate the default_field setting.
 * Matches Beats code here:
 * https://github.com/elastic/beats/blob/eee127cb59b56f2ed7c7e317398c3f79c4158216/libbeat/template/processor.go#L104
 */
const METRICBEAT_DEFAULT_FIELD_TYPES: ReadonlySet<string> = new Set(['keyword', 'text', 'ip']);
const METRICBEAT_OTHER_DEFAULT_FIELDS: ReadonlySet<string> = new Set(['fields.*']);

interface FixDefaultFieldsButtonProps {
  indexName: string;
}

interface FixDefaultFieldsButtonState {
  fixLoadingState?: LoadingState;
}

/**
 * Renders a button if given index is a valid Metricbeat index to add a default_field setting.
 */
export class FixDefaultFieldsButton extends React.Component<
  FixDefaultFieldsButtonProps,
  FixDefaultFieldsButtonState
> {
  constructor(props: FixDefaultFieldsButtonProps) {
    super(props);
    this.state = {};
  }

  public render() {
    const { fixLoadingState } = this.state;

    if (!this.isMetricbeatIndex()) {
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

  private isMetricbeatIndex = () => {
    return this.props.indexName.startsWith('metricbeat-');
  };

  private fixMetricbeatIndex = async () => {
    if (!this.isMetricbeatIndex()) {
      return;
    }

    this.setState({
      fixLoadingState: LoadingState.Loading,
    });

    try {
      await kfetch({
        pathname: `/api/upgrade_assistant/add_query_default_field/${this.props.indexName}`,
        method: 'POST',
        body: JSON.stringify({
          fieldTypes: [...METRICBEAT_DEFAULT_FIELD_TYPES],
          otherFields: [...METRICBEAT_OTHER_DEFAULT_FIELDS],
        }),
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
