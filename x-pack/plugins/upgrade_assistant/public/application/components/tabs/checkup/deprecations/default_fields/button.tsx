/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { HttpSetup } from 'src/core/public';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LoadingState } from '../../../../types';

/**
 * Field types used by Metricbeat to generate the default_field setting.
 * Matches Beats code here:
 * https://github.com/elastic/beats/blob/eee127cb59b56f2ed7c7e317398c3f79c4158216/libbeat/template/processor.go#L104
 */
const BEAT_DEFAULT_FIELD_TYPES: ReadonlySet<string> = new Set(['keyword', 'text', 'ip']);
const BEAT_OTHER_DEFAULT_FIELDS: ReadonlySet<string> = new Set(['fields.*']);

interface FixDefaultFieldsButtonProps {
  http: HttpSetup;
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

    if (!this.isBeatsIndex()) {
      return null;
    }

    const buttonProps: any = { size: 's', onClick: this.fixBeatsIndex };
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

  private isBeatsIndex = () => {
    const { indexName } = this.props;
    return indexName.startsWith('metricbeat-') || indexName.startsWith('filebeat-');
  };

  private fixBeatsIndex = async () => {
    if (!this.isBeatsIndex()) {
      return;
    }

    this.setState({
      fixLoadingState: LoadingState.Loading,
    });

    try {
      await this.props.http.post(
        `/api/upgrade_assistant/add_query_default_field/${this.props.indexName}`,
        {
          body: JSON.stringify({
            fieldTypes: [...BEAT_DEFAULT_FIELD_TYPES],
            otherFields: [...BEAT_OTHER_DEFAULT_FIELDS],
          }),
        }
      );

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
