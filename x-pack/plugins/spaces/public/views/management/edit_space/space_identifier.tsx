/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { Space } from '../../../../common/model/space';
import { SpaceValidator } from '../lib';

interface Props {
  space: Partial<Space>;
  editable: boolean;
  validator: SpaceValidator;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

interface State {
  editing: boolean;
}

export class SpaceIdentifier extends Component<Props, State> {

  private textFieldRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      editing: false,
    };
  }

  public render() {
    const {
      id = ''
    } = this.props.space;

    return (
      <Fragment>
        <EuiFormRow
          label={this.getLabel()}
          helpText={this.getHelpText()}
          {...this.props.validator.validateURLIdentifier(this.props.space)}
          fullWidth
        >
          <EuiFieldText
            readOnly={!this.state.editing}
            placeholder={
              this.state.editing || !this.props.editable
                ? undefined
                : 'The URL identifier is generated from the space name.'
            }
            value={id}
            onChange={this.onChange}
            inputRef={(ref) => this.textFieldRef = ref}
            fullWidth
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  public getLabel = () => {
    if (!this.props.editable) {
      return (<p>URL identifier</p>);
    }

    const editLinkText = this.state.editing ? `[stop editing]` : `[edit]`;
    return (<p>URL identifier <EuiLink onClick={this.onEditClick}>{editLinkText}</EuiLink></p>);
  };

  public getHelpText = () => {
    return (<p>If the identifier is <strong>engineering</strong>, the Kibana URL is <br /> https://my-kibana.example<strong>/s/engineering/</strong>app/kibana.</p>);
  };

  public onEditClick = () => {
    this.setState({
      editing: !this.state.editing
    }, () => {
      if (this.textFieldRef && this.state.editing) {
        this.textFieldRef.focus();
      }
    });
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.state.editing) { return; }
    this.props.onChange(e);
  };
}
