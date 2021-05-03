/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  visualizeGeoFieldTrigger,
  VISUALIZE_GEO_FIELD_TRIGGER,
  UiActionsStart,
} from '../../../../../src/plugins/ui_actions/public';

interface Props {
  indexPatternId: string;
  fieldName: string;
  uiActions: UiActionsStart;
}

interface State {
  hasLoadedHref: boolean;
  href?: string;
}

export class VisualizeGeoFieldButton extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    hasLoadedHref: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadHref();
  }

  async loadHref() {
    const actions = await this.props.uiActions.getTriggerCompatibleActions(
      VISUALIZE_GEO_FIELD_TRIGGER,
      {
        indexPatternId: this.props.indexPatternId,
        fieldName: this.props.fieldName,
      }
    );
    const triggerOptions = {
      indexPatternId: this.props.indexPatternId,
      fieldName: this.props.fieldName,
      trigger: visualizeGeoFieldTrigger,
    };
    const href = actions.length ? await actions[0].getHref?.(triggerOptions) : undefined;

    if (this._isMounted) {
      this.setState({
        hasLoadedHref: true,
        href,
      });
    }
  }

  onClick = (event: unknown) => {
    this.props.uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER).exec({
      indexPatternId: this.props.indexPatternId,
      fieldName: this.props.fieldName,
    });
  };

  render() {
    return (
      <>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButton
          onClick={this.onClick}
          href={this.state.href}
          size="s"
          data-test-subj={`lensGeoFieldVisualize-${this.props.fieldName}`}
        >
          <FormattedMessage
            id="xpack.lens.indexPattern.fieldItem.visualizeGeoFieldLinkText"
            defaultMessage="Visualize in Maps"
          />
        </EuiButton>
      </>
    );
  }
}
