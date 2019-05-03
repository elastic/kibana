/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldSearch,
  EuiCard,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModalHeader,
  EuiModalBody,
  EuiTabbedContent,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';
import lowerCase from 'lodash.lowercase';
import { map, includes, sortBy } from 'lodash';
import { ConfirmModal } from '../confirm_modal/confirm_modal';
import { CustomElementModal } from '../sidebar_header/custom_element_modal';
import { ElementControls } from './element_controls';

export class ElementTypes extends Component {
  static propTypes = {
    addCustomElement: PropTypes.func.isRequired,
    addElement: PropTypes.func.isRequired,
    customElements: PropTypes.array.isRequired,
    elements: PropTypes.object,
    findCustomElements: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    removeCustomElement: PropTypes.func.isRequired,
    search: PropTypes.string,
    setCustomElements: PropTypes.func.isRequired,
    setSearch: PropTypes.func.isRequired,
    updateCustomElement: PropTypes.func.isRequired,
  };

  state = {
    isEditModalVisible: false,
    isDeleteModalVisible: false,
    elementToDelete: null,
    elementToEdit: null,
  };

  componentDidMount() {
    // fetch custom elements
    this.props.findCustomElements();
  }

  _showEditModal = elementToEdit => this.setState({ isEditModalVisible: true, elementToEdit });

  _hideEditModal = () => this.setState({ isEditModalVisible: false, elementToEdit: null });

  _showDeleteModal = elementToDelete =>
    this.setState({ isDeleteModalVisible: true, elementToDelete });

  _hideDeleteModal = () => this.setState({ isDeleteModalVisible: false, elementToDelete: null });

  _getElementCards = (elements, handleClick, showControls = false) => {
    const { search, onClose } = this.props;
    return map(elements, (element, name) => {
      const { help, displayName, image } = element;
      const whenClicked = () => {
        handleClick(element);
        onClose();
      };

      const card = (
        <EuiFlexItem key={name} className="canvasElementCard">
          <EuiCard
            textAlign="left"
            image={image}
            icon={image ? null : <EuiIcon type="canvasApp" size="xxl" />}
            title={displayName}
            description={help}
            onClick={whenClicked}
            className={image ? 'canvasCard' : 'canvasCard canvasCard--hasIcon'}
          />
          {showControls && (
            <ElementControls
              onEdit={() => this._showEditModal(element)}
              onDelete={() => this._showDeleteModal(element)}
            />
          )}
        </EuiFlexItem>
      );

      if (!search) {
        return card;
      }
      if (includes(lowerCase(name), search)) {
        return card;
      }
      if (includes(lowerCase(displayName), search)) {
        return card;
      }
      if (includes(lowerCase(help), search)) {
        return card;
      }
      return null;
    });
  };

  _renderEditModal = () => {
    const { updateCustomElement } = this.props;
    const { elementToEdit } = this.state;
    return (
      <CustomElementModal
        title="Edit element"
        name={elementToEdit.displayName}
        description={elementToEdit.help}
        image={elementToEdit.image}
        onSave={updateCustomElement(elementToEdit.id)}
        onCancel={this._hideEditModal}
      />
    );
  };

  _renderDeleteModal = () => {
    const { removeCustomElement } = this.props;
    const { elementToDelete } = this.state;
    return (
      <ConfirmModal
        isOpen
        title={`Delete element '${elementToDelete.displayName}'?`}
        message="Are you sure you want to delete this element?"
        confirmButtonText="Delete"
        onConfirm={() => {
          removeCustomElement(elementToDelete.id);
          this._hideDeleteModal();
        }}
        onCancel={this._hideDeleteModal}
      />
    );
  };

  render() {
    const { setSearch, addElement, addCustomElement } = this.props;
    let { elements, search, customElements } = this.props;
    const { isEditModalVisible, isDeleteModalVisible, elementToEdit, elementToDelete } = this.state;
    search = lowerCase(search);
    elements = sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');
    const elementList = this._getElementCards(elements, addElement);

    let customElementContent = (
      // TODO: update copy
      <EuiEmptyPrompt
        iconType="vector"
        title={<h2>Add new elements</h2>}
        body={<p>Group and save workpad elements to create new elements</p>}
        titleSize="s"
      />
    );

    if (customElements.length) {
      customElements = sortBy(
        map(customElements, (element, name) => ({ name, ...element })),
        'name'
      );
      customElementContent = this._getElementCards(customElements, addCustomElement, true);
    }

    const tabs = [
      {
        id: 'elements',
        name: 'Elements',
        content: (
          <Fragment>
            <EuiSpacer />
            <EuiFlexGrid gutterSize="l" columns={4}>
              {elementList}
            </EuiFlexGrid>
          </Fragment>
        ),
      },
      {
        id: 'customElements',
        name: 'My elements',
        content: (
          <Fragment>
            <EuiSpacer />
            <EuiFlexGrid gutterSize="l" columns={4}>
              {customElementContent}
            </EuiFlexGrid>
          </Fragment>
        ),
      },
    ];

    return (
      <Fragment>
        <EuiModalHeader>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFieldSearch
                className="canvasElements__filter"
                placeholder="Filter elements"
                onChange={e => setSearch(e.target.value)}
                value={search}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
        </EuiModalBody>

        {isEditModalVisible && elementToEdit && this._renderEditModal()}

        {isDeleteModalVisible && elementToDelete && this._renderDeleteModal()}
      </Fragment>
    );
  }
}
