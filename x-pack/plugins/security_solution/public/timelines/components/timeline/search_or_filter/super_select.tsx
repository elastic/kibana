/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
  Duplicated EuiSuperSelect, because due to the recent changes there is no way to pass panelClassName
  prop to EuiInputPopover, which doesn't allow us to properly style the EuiInputPopover panel
  (we want the panel to be wider than the input)
*/

import {
  EuiSuperSelectProps,
  EuiScreenReaderOnly,
  EuiSuperSelectControl,
  EuiInputPopover,
  EuiContextMenuItem,
  keys,
  EuiI18n,
} from '@elastic/eui';
import React, { Component } from 'react';
import classNames from 'classnames';

enum ShiftDirection {
  BACK = 'back',
  FORWARD = 'forward',
}

export class EuiSuperSelect<T extends string> extends Component<EuiSuperSelectProps<T>> {
  static defaultProps = {
    compressed: false,
    fullWidth: false,
    hasDividers: false,
    isInvalid: false,
    isLoading: false,
  };

  private itemNodes: Array<HTMLButtonElement | null> = [];
  private _isMounted: boolean = false;

  state = {
    isPopoverOpen: this.props.isOpen || false,
  };

  componentDidMount() {
    this._isMounted = true;
    if (this.props.isOpen) {
      this.openPopover();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  setItemNode = (node: HTMLButtonElement | null, index: number) => {
    this.itemNodes[index] = node;
  };

  openPopover = () => {
    this.setState({
      isPopoverOpen: true,
    });

    const focusSelected = () => {
      const indexOfSelected = this.props.options.reduce<number | null>((acc, option, index) => {
        if (acc != null) return acc;
        if (option == null) return null;
        return option.value === this.props.valueOfSelected ? index : null;
      }, null);

      requestAnimationFrame(() => {
        if (!this._isMounted) {
          return;
        }

        if (this.props.valueOfSelected != null) {
          if (indexOfSelected != null) {
            this.focusItemAt(indexOfSelected);
          } else {
            focusSelected();
          }
        }
      });
    };

    requestAnimationFrame(focusSelected);
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  itemClicked = (value: T) => {
    this.setState({
      isPopoverOpen: false,
    });
    if (this.props.onChange) {
      this.props.onChange(value);
    }
  };

  onSelectKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === keys.ARROW_UP || event.key === keys.ARROW_DOWN) {
      event.preventDefault();
      event.stopPropagation();
      this.openPopover();
    }
  };

  onItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case keys.ESCAPE:
        // close the popover and prevent ancestors from handling
        event.preventDefault();
        event.stopPropagation();
        this.closePopover();
        break;

      case keys.TAB:
        // no-op
        event.preventDefault();
        event.stopPropagation();
        break;

      case keys.ARROW_UP:
        event.preventDefault();
        event.stopPropagation();
        this.shiftFocus(ShiftDirection.BACK);
        break;

      case keys.ARROW_DOWN:
        event.preventDefault();
        event.stopPropagation();
        this.shiftFocus(ShiftDirection.FORWARD);
        break;
    }
  };

  focusItemAt(index: number) {
    const targetElement = this.itemNodes[index];
    if (targetElement != null) {
      targetElement.focus();
    }
  }

  shiftFocus(direction: ShiftDirection) {
    const currentIndex = this.itemNodes.indexOf(document.activeElement as HTMLButtonElement);
    let targetElementIndex: number;

    if (currentIndex === -1) {
      // somehow the select options has lost focus
      targetElementIndex = 0;
    } else {
      if (direction === ShiftDirection.BACK) {
        targetElementIndex = currentIndex === 0 ? this.itemNodes.length - 1 : currentIndex - 1;
      } else {
        targetElementIndex = currentIndex === this.itemNodes.length - 1 ? 0 : currentIndex + 1;
      }
    }

    this.focusItemAt(targetElementIndex);
  }

  render() {
    const {
      className,
      options,
      valueOfSelected,
      onChange,
      isOpen,
      isInvalid,
      hasDividers,
      itemClassName,
      itemLayoutAlign,
      fullWidth,
      popoverProps,
      compressed,
      ...rest
    } = this.props;

    const popoverClasses = classNames('euiSuperSelect', popoverProps?.className);

    const buttonClasses = classNames(
      {
        'euiSuperSelect--isOpen__button': this.state.isPopoverOpen,
      },
      className
    );

    const itemClasses = classNames(
      'euiSuperSelect__item',
      {
        'euiSuperSelect__item--hasDividers': hasDividers,
      },
      itemClassName
    );

    const button = (
      <EuiSuperSelectControl
        options={options}
        value={valueOfSelected}
        onClick={this.state.isPopoverOpen ? this.closePopover : this.openPopover}
        onKeyDown={this.onSelectKeyDown}
        className={buttonClasses}
        fullWidth={fullWidth}
        isInvalid={isInvalid}
        compressed={compressed}
        {...rest}
      />
    );

    const items = options.map((option, index) => {
      const { value, dropdownDisplay, inputDisplay, ...optionRest } = option;

      return (
        <EuiContextMenuItem
          key={index}
          className={itemClasses}
          icon={valueOfSelected === value ? 'check' : 'empty'}
          onClick={() => this.itemClicked(value)}
          onKeyDown={this.onItemKeyDown}
          layoutAlign={itemLayoutAlign}
          buttonRef={(node) => this.setItemNode(node, index)}
          role="option"
          id={value}
          aria-selected={valueOfSelected === value}
          {...optionRest}
        >
          {dropdownDisplay || inputDisplay}
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiInputPopover
        {...popoverProps}
        className={popoverClasses}
        input={button}
        isOpen={isOpen || this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        panelClassName={popoverClasses}
        fullWidth={fullWidth}
        repositionOnScroll
        anchorPosition="downCenter"
      >
        <EuiScreenReaderOnly>
          <p role="alert">
            <EuiI18n
              token="euiSuperSelect.screenReaderAnnouncement"
              default="You are in a form selector of {optionsCount} items and must select a single option.
              Use the up and down keys to navigate or escape to close."
              values={{ optionsCount: options.length }}
            />
          </p>
        </EuiScreenReaderOnly>
        <div
          className="euiSuperSelect__listbox"
          role="listbox"
          aria-activedescendant={valueOfSelected}
          tabIndex={0}
        >
          {items}
        </div>
      </EuiInputPopover>
    );
  }
}
