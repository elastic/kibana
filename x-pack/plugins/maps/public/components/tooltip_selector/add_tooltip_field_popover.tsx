/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, Fragment } from 'react';
import {
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiSelectable,
  EuiSelectableOption,
  EuiButton,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';

export type FieldProps = {
  label: string;
  type: string;
  name: string;
};

type FieldOption = EuiSelectableOption<{ value: string }>;

function sortByLabel(a: EuiSelectableOption, b: EuiSelectableOption): number {
  return a.label.localeCompare(b.label);
}

function getOptions(fields: FieldProps[], selectedFields: FieldProps[]): EuiSelectableOption[] {
  if (!fields) {
    return [];
  }

  return fields
    .filter((field) => {
      // remove selected fields
      const isFieldSelected = !!selectedFields.find((selectedField) => {
        return field.name === selectedField.name;
      });
      return !isFieldSelected;
    })
    .map((field) => {
      return {
        value: field.name,
        prepend:
          'type' in field ? (
            <FieldIcon className="eui-alignMiddle" type={field.type} fill="none" />
          ) : null,
        label: field.label,
      };
    })
    .sort(sortByLabel);
}

interface Props {
  onAdd: (checkedFieldNames: string[]) => void;
  fields: FieldProps[];
  selectedFields: FieldProps[];
}

interface State {
  isPopoverOpen: boolean;
  checkedFields: string[];
  options?: FieldOption[];
  prevFields?: FieldProps[];
  prevSelectedFields?: FieldProps[];
}

export class AddTooltipFieldPopover extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    checkedFields: [],
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (
      nextProps.fields !== prevState.prevFields ||
      nextProps.selectedFields !== prevState.prevSelectedFields
    ) {
      return {
        options: getOptions(nextProps.fields, nextProps.selectedFields),
        checkedFields: [],
        prevFields: nextProps.fields,
        prevSelectedFields: nextProps.selectedFields,
      };
    }

    return null;
  }

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onSelect = (options: FieldOption[]) => {
    const checkedFields: string[] = options
      .filter((option) => {
        return option.checked === 'on';
      })
      .map((option) => {
        return option.value;
      });

    this.setState({
      checkedFields,
      options,
    });
  };

  _onAdd = () => {
    this.props.onAdd(this.state.checkedFields);
    this.setState({ checkedFields: [] });
    this._closePopover();
  };

  _renderAddButton() {
    return (
      <EuiButtonEmpty
        onClick={this._togglePopover}
        size="xs"
        iconType="plusInCircleFilled"
        isDisabled={!this.props.fields}
      >
        <FormattedMessage id="xpack.maps.tooltipSelector.togglePopoverLabel" defaultMessage="Add" />
      </EuiButtonEmpty>
    );
  }

  _renderContent() {
    const addLabel =
      this.state.checkedFields.length === 0
        ? i18n.translate('xpack.maps.tooltipSelector.addLabelWithoutCount', {
            defaultMessage: 'Add',
          })
        : i18n.translate('xpack.maps.tooltipSelector.addLabelWithCount', {
            defaultMessage: 'Add {count}',
            values: { count: this.state.checkedFields.length },
          });

    return (
      <Fragment>
        <EuiSelectable<FieldOption>
          searchable
          searchProps={{ compressed: true }}
          options={this.state.options}
          onChange={this._onSelect}
        >
          {(list, search) => (
            <div style={{ width: '300px' }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>

        <EuiSpacer size="xs" />
        <EuiPopoverFooter paddingSize="s">
          <EuiTextAlign textAlign="right">
            <EuiButton
              fill
              isDisabled={this.state.checkedFields.length === 0}
              onClick={this._onAdd}
              size="s"
            >
              {addLabel}
            </EuiButton>
          </EuiTextAlign>
        </EuiPopoverFooter>
      </Fragment>
    );
  }

  render() {
    return (
      <EuiPopover
        id="addTooltipFieldPopover"
        anchorPosition="leftCenter"
        button={this._renderAddButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        ownFocus
      >
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
