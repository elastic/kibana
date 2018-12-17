/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePicker, EuiFieldText, EuiFormRow, EuiPopover } from '@elastic/eui';
import classNames from 'classnames';
import moment, { Moment } from 'moment';
import React from 'react';

type Position = 'start' | 'end';

interface Props {
  id: string;
  position: Position;
  isInvalid: boolean;
  needsUpdating?: boolean;
  date: Moment;
  buttonProps?: string;
  buttonOnly?: boolean;
  onChange: (date: moment.Moment | null) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class GlobalDateButton extends React.PureComponent<Props, State> {
  public readonly state = {
    isPopoverOpen: false,
  };

  public render() {
    const {
      id,
      position,
      isInvalid,
      needsUpdating = false,
      date,
      buttonProps,
      buttonOnly,
      onChange,
      ...rest
    } = this.props;

    const { isPopoverOpen } = this.state;

    const classes = classNames([
      'euiGlobalDatePicker__dateButton',
      `euiGlobalDatePicker__dateButton--${position}`,
      {
        'euiGlobalDatePicker__dateButton-isSelected': isPopoverOpen,
        'euiGlobalDatePicker__dateButton-isInvalid': isInvalid,
        'euiGlobalDatePicker__dateButton-needsUpdating': needsUpdating,
      },
    ]);

    let title = date.format('L LTS');
    if (isInvalid) {
      title = `Invalid date: ${title}`;
    } else if (needsUpdating) {
      title = `Update needed: ${title}`;
    }

    const button = (
      <button
        onClick={buttonOnly ? undefined : this.togglePopover}
        className={classes}
        title={title}
        {...buttonProps}
      >
        {date.format('L LTS')}
      </button>
    );

    return buttonOnly ? (
      button
    ) : (
      <EuiPopover
        id={`${id}-popover`}
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        anchorPosition="downRight"
        panelPaddingSize="none"
        ownFocus
        {...rest}
      >
        <div style={{ width: 390, padding: 0 }}>
          <EuiDatePicker
            selected={date}
            dateFormat="L LTS"
            inline
            fullWidth
            showTimeSelect
            shadow={false}
            onChange={onChange}
          />
          <EuiFormRow style={{ padding: '0 8px 8px' }}>
            <EuiFieldText />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }

  private togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}
