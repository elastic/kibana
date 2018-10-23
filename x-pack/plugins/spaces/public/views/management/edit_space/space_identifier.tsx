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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
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

export class SpaceIdentifierUI extends Component<Props, State> {

  private textFieldRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      editing: false,
    };
  }

  public render() {
    const { intl } = this.props;
    const {
      id = ''
    } = this.props.space;

    return (
      <Fragment>
        <EuiFormRow
          label={this.getLabel()}
          helpText={this.getHelpText()}
          {...this.props.validator.validateURLIdentifier(this.props.space)}
        >
          <EuiFieldText
            readOnly={!this.state.editing}
            placeholder={
              this.state.editing || !this.props.editable
                ? undefined
                : intl.formatMessage({
                    id: 'xpack.spaces.view.management.editSpace.spaceIdentifier.generateIdentifierFromSpaceNameTitle',
                    defaultMessage: 'The URL identifier is generated from the space name.',
                  })
            }
            value={id}
            onChange={this.onChange}
            inputRef={(ref) => this.textFieldRef = ref}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  public getLabel = () => {
    if (!this.props.editable) {
      return (
      <p>
        <FormattedMessage
          id="xpack.spaces.view.management.editSpace.spaceIdentifier.URLIdentifierTitle"
          defaultMessage="URL identifier"
        />
      </p>);
    }

    const editLinkText = this.state.editing ? (
      <FormattedMessage
        id="xpack.spaces.view.management.editSpace.spaceIdentifier.stopEditingSpaceNameTitle"
        defaultMessage="[stop editing]"
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.view.management.editSpace.spaceIdentifier.editSpaceNameTitle"
        defaultMessage="[edit]"
      />
    );
    return (
      <p>
        <FormattedMessage
          id="xpack.spaces.view.management.editSpace.spaceIdentifier.URLIdentifierButton"
          defaultMessage="URL identifier"
        />
        <EuiLink onClick={this.onEditClick}>{editLinkText}</EuiLink>
      </p>
    );
  };

  public getHelpText = () => {
    return (
      <p>
        <FormattedMessage
          id="xpack.spaces.view.management.editSpace.spaceIdentifier.kibanaURLTitle"
          defaultMessage="If the identifier is {exampleMessage}, the Kibana URL is{nextLine}
          https://my-kibana.example{examoleURL}app/kibana."
          values={{
            exampleMessage: (
              <strong>
                <FormattedMessage
                  id="xpack.spaces.view.management.editSpace.spaceIdentifier.engineeringTitle"
                  defaultMessage="engineering"
                />
              </strong>
            ),
            examoleURL: (
              <strong>
                <FormattedMessage
                  id="xpack.spaces.view.management.editSpace.spaceIdentifier.engineeringURLTitle"
                  defaultMessage="/s/engineering/"
                />
              </strong>
            ),
            nextLine: <br />
          }}
        />
      </p>
    );
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

export const SpaceIdentifier = injectI18n(SpaceIdentifierUI);
