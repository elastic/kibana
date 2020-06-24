/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*disabling eslint because of these jsx-a11y errors(https://www.npmjs.com/package/eslint-plugin-jsx-a11y):
181:7   error  Elements with the 'combobox' interactive role must be focusable                                                 jsx-a11y/interactive-supports-focus
  187:9   error  Elements with the ARIA role "combobox" must have the following attributes defined: aria-controls,aria-expanded  jsx-a11y/role-has-required-aria-props
  209:23  error  Elements with the 'option' interactive role must be focusable                                                   jsx-a11y/interactive-supports-focus
  218:25  error  Elements with the ARIA role "option" must have the following attributes defined: aria-selected                  jsx-a11y/role-has-required-aria-props
*/
/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/role-has-required-aria-props */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, keys } from '@elastic/eui';

/**
 * An autocomplete component. Currently this is only used for the expression editor but in theory
 * it could be extended to any autocomplete-related component. It expects these props:
 *
 * header: The header node
 * items: The list of items for autocompletion
 * onSelect: The function to invoke when an item is selected (passing in the item)
 * children: Any child nodes, which should include the text input itself
 * reference: A function that is passed the selected item which generates a reference node
 */
export class Autocomplete extends React.Component {
  static propTypes = {
    header: PropTypes.node,
    items: PropTypes.array,
    onSelect: PropTypes.func,
    children: PropTypes.node,
    reference: PropTypes.func,
  };

  constructor() {
    super();
    this.state = {
      isOpen: false,
      isFocused: false,
      isMousedOver: false,
      selectedIndex: -1,
    };

    // These are used for automatically scrolling items into view when selected
    this.containerRef = null;
    this.itemRefs = [];
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.items &&
      prevProps.items !== this.props.items &&
      this.props.items.length === 1 &&
      this.state.selectedIndex !== 0
    ) {
      this.selectFirst();
    }

    if (prevState.selectedIndex !== this.state.selectedIndex) {
      this.scrollIntoView();
    }
  }

  selectFirst() {
    this.setState({ selectedIndex: 0 });
  }

  isVisible() {
    const { isOpen, isFocused, isMousedOver } = this.state;
    const { items, reference } = this.props;

    // We have to check isMousedOver because the blur event fires before the click event, which
    // means if we didn't keep track of isMousedOver, we wouldn't even get the click event
    const visible = isOpen && (isFocused || isMousedOver);
    const hasItems = items && items.length;
    const hasReference = reference(this.getSelectedItem());

    return visible && (hasItems || hasReference);
  }

  getSelectedItem() {
    return this.props.items && this.props.items[this.state.selectedIndex];
  }

  selectPrevious() {
    const { items } = this.props;
    const { selectedIndex } = this.state;
    if (selectedIndex > 0) {
      this.setState({ selectedIndex: selectedIndex - 1 });
    } else {
      this.setState({ selectedIndex: items.length - 1 });
    }
  }

  selectNext() {
    const { items } = this.props;
    const { selectedIndex } = this.state;
    if (selectedIndex >= 0 && selectedIndex < items.length - 1) {
      this.setState({ selectedIndex: selectedIndex + 1 });
    } else {
      this.setState({ selectedIndex: 0 });
    }
  }

  scrollIntoView() {
    const {
      containerRef,
      itemRefs,
      state: { selectedIndex },
    } = this;
    const itemRef = itemRefs[selectedIndex];
    if (!containerRef || !itemRef) {
      return;
    }
    containerRef.scrollTop = Math.max(
      Math.min(containerRef.scrollTop, itemRef.offsetTop),
      itemRef.offsetTop + itemRef.offsetHeight - containerRef.offsetHeight
    );
  }

  onSubmit = () => {
    const { selectedIndex } = this.state;
    const { items, onSelect } = this.props;
    onSelect(items[selectedIndex]);
    this.setState({ selectedIndex: -1 });
  };

  /**
   * Handle key down events for the menu, including selecting the previous and next items, making
   * the item selection, closing the menu, etc.
   */
  onKeyDown = (e) => {
    const { BACKSPACE, ESCAPE, TAB, ENTER, ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT } = keys;
    const { key } = e;
    const { items } = this.props;
    const { isOpen, selectedIndex } = this.state;

    if ([ESCAPE, ARROW_LEFT, ARROW_RIGHT].includes(key)) {
      this.setState({ isOpen: false });
    }

    if ([TAB, ENTER].includes(key) && isOpen && selectedIndex >= 0) {
      e.preventDefault();
      this.onSubmit();
    } else if (key === ARROW_UP && items.length > 0 && isOpen) {
      e.preventDefault();
      this.selectPrevious();
    } else if (key === ARROW_DOWN && items.length > 0 && isOpen) {
      e.preventDefault();
      this.selectNext();
    } else if (key === BACKSPACE) {
      this.setState({ isOpen: true });
    } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
      this.setState({ selectedIndex: -1 });
    }
  };

  /**
   * On key press (character keys), show the menu. We don't want to willy nilly show the menu
   * whenever ANY key down event happens (like arrow keys) cuz that would be just downright
   * annoying.
   */
  onKeyPress = () => {
    this.setState({ isOpen: true });
  };

  onFocus = () => {
    this.setState({
      isFocused: true,
    });
  };

  onBlur = () => {
    this.setState({
      isFocused: false,
    });
  };

  onMouseDown = () => {
    this.setState({
      isOpen: false,
    });
  };

  onMouseEnter = () => {
    this.setState({
      isMousedOver: true,
    });
  };

  onMouseLeave = () => {
    this.setState({ isMousedOver: false });
  };

  render() {
    const { header, items, reference } = this.props;
    return (
      <div
        className="autocomplete"
        onKeyDown={this.onKeyDown}
        onKeyPress={this.onKeyPress}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        role="combobox"
        aria-haspopup="true"
        aria-owns="autocompleteItems"
        aria-expanded={this.isVisible() ? 'true' : 'false'}
      >
        {this.isVisible() ? (
          <EuiPanel
            paddingSize="none"
            className="autocompletePopup"
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
          >
            <EuiFlexGroup gutterSize="none">
              {items && items.length ? (
                <EuiFlexItem style={{ maxWidth: 400 }}>
                  <div
                    className="autocompleteItems"
                    ref={(ref) => (this.containerRef = ref)}
                    role="listbox"
                  >
                    {header}
                    {items.map((item, i) => (
                      <div
                        key={i}
                        ref={(ref) => (this.itemRefs[i] = ref)}
                        className={
                          'autocompleteItem' +
                          (this.state.selectedIndex === i ? ' autocompleteItem--isActive' : '')
                        }
                        onMouseEnter={() => this.setState({ selectedIndex: i })}
                        onClick={this.onSubmit}
                        role="option"
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                </EuiFlexItem>
              ) : (
                ''
              )}
              <EuiFlexItem>
                <div className="autocompleteReference">{reference(this.getSelectedItem())}</div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ) : (
          ''
        )}
        <div className="canvasAutocomplete__inner" onMouseDown={this.onMouseDown}>
          {this.props.children}
        </div>
      </div>
    );
  }
}
