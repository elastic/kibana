/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { Space } from '../../../../common/model/space';
import { SpaceValidator, toSpaceIdentifier } from '../../lib';

interface Props {
  space: Partial<Space>;
  editable: boolean;
  validator: SpaceValidator;
  intl: InjectedIntl;
  onChange: (updatedIdentifier: string) => void;
}

interface State {
  editing: boolean;
}

class SpaceIdentifierUI extends Component<Props, State> {
  private textFieldRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      editing: false,
    };
  }

  public render() {
    const { intl } = this.props;
    const { id = '' } = this.props.space;

    return (
      <Fragment>
        <EuiFormRow
          label={this.getLabel()}
          helpText={this.getHelpText(id)}
          {...this.props.validator.validateURLIdentifier(this.props.space)}
          fullWidth
        >
          <EuiFieldText
            readOnly={!this.state.editing}
            placeholder={
              this.state.editing || !this.props.editable
                ? undefined
                : intl.formatMessage({
                    id:
                      'xpack.spaces.management.spaceIdentifier.urlIdentifierGeneratedFromSpaceNameTooltip',
                    defaultMessage: 'awesome-space',
                  })
            }
            value={id}
            onChange={this.onChange}
            inputRef={(ref) => (this.textFieldRef = ref)}
            fullWidth
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
            id="xpack.spaces.management.spaceIdentifier.urlIdentifierTitle"
            defaultMessage="URL identifier"
          />
        </p>
      );
    }

    const editLinkText = this.state.editing ? (
      <FormattedMessage
        id="xpack.spaces.management.spaceIdentifier.resetSpaceNameLinkText"
        defaultMessage="[reset]"
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.management.spaceIdentifier.customizeSpaceLinkText"
        defaultMessage="[customize]"
      />
    );

    const editLinkLabel = this.state.editing
      ? this.props.intl.formatMessage({
          id: 'xpack.spaces.management.spaceIdentifier.resetSpaceNameLinkLabel',
          defaultMessage: 'Reset the URL identifier',
        })
      : this.props.intl.formatMessage({
          id: 'xpack.spaces.management.spaceIdentifier.customizeSpaceNameLinkLabel',
          defaultMessage: 'Customize the URL identifier',
        });

    return (
      <p>
        <FormattedMessage
          id="xpack.spaces.management.spaceIdentifier.urlIdentifierLabel"
          defaultMessage="URL identifier "
        />
        <EuiLink onClick={this.onEditClick} aria-label={editLinkLabel}>
          {editLinkText}
        </EuiLink>
      </p>
    );
  };

  public getHelpText = (
    identifier: string = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.spaceIdentifier.emptySpaceIdentifierText',
      defaultMessage: 'awesome-space',
    })
  ) => {
    return (
      <p className="eui-textBreakAll">
        <FormattedMessage
          id="xpack.spaces.management.spaceIdentifier.kibanaURLForSpaceIdentifierDescription"
          defaultMessage="Example: https://my-kibana.example{spaceIdentifier}/app/kibana."
          values={{
            spaceIdentifier: <strong>/s/{identifier}</strong>,
          }}
        />
      </p>
    );
  };

  public onEditClick = () => {
    const currentlyEditing = this.state.editing;
    if (currentlyEditing) {
      // "Reset" clicked. Create space identifier based on the space name.
      const resetIdentifier = toSpaceIdentifier(this.props.space.name);

      this.setState({
        editing: false,
      });
      this.props.onChange(resetIdentifier);
    } else {
      this.setState(
        {
          editing: true,
        },
        () => {
          if (this.textFieldRef) {
            this.textFieldRef.focus();
          }
        }
      );
    }
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.state.editing) {
      return;
    }
    this.props.onChange(e.target.value);
  };
}

export const SpaceIdentifier = injectI18n(SpaceIdentifierUI);
