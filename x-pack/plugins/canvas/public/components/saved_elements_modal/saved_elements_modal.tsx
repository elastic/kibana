/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ChangeEvent, FunctionComponent, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiSpacer,
  EuiOverlayMask,
  EuiButton,
} from '@elastic/eui';
import { sortBy } from 'lodash';
import { ComponentStrings } from '../../../i18n';
import { CustomElement } from '../../../types';
import { ConfirmModal } from '../confirm_modal/confirm_modal';
import { CustomElementModal } from '../custom_element_modal';
import { ElementGrid } from './element_grid';

const { SavedElementsModal: strings } = ComponentStrings;

export interface Props {
  /**
   * Adds the custom element to the workpad
   */
  addCustomElement: (customElement: CustomElement) => void;
  /**
   * Queries ES for custom element saved objects
   */
  findCustomElements: () => void;
  /**
   * Handler invoked when the modal closes
   */
  onClose: () => void;
  /**
   * Deletes the custom element
   */
  removeCustomElement: (id: string) => void;
  /**
   * Saved edits to the custom element
   */
  updateCustomElement: (id: string, name: string, description: string, image: string) => void;
  /**
   * Array of custom elements to display
   */
  customElements: CustomElement[];
  /**
   * Text used to filter custom elements list
   */
  search: string;
  /**
   * Setter for search text
   */
  setSearch: (search: string) => void;
}

export const SavedElementsModal: FunctionComponent<Props> = ({
  search,
  setSearch,
  customElements,
  addCustomElement,
  findCustomElements,
  onClose,
  removeCustomElement,
  updateCustomElement,
}) => {
  const [elementToDelete, setElementToDelete] = useState<CustomElement | null>(null);
  const [elementToEdit, setElementToEdit] = useState<CustomElement | null>(null);

  useEffect(() => {
    findCustomElements();
  });

  const showEditModal = (element: CustomElement) => setElementToEdit(element);
  const hideEditModal = () => setElementToEdit(null);

  const handleEdit = async (name: string, description: string, image: string) => {
    if (elementToEdit) {
      updateCustomElement(elementToEdit.id, name, description, image);
    }
    hideEditModal();
  };

  const showDeleteModal = (element: CustomElement) => setElementToDelete(element);
  const hideDeleteModal = () => setElementToDelete(null);

  const handleDelete = async () => {
    if (elementToDelete) {
      removeCustomElement(elementToDelete.id);
    }
    hideDeleteModal();
  };

  const renderEditModal = () => {
    if (!elementToEdit) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <CustomElementModal
          title={strings.getEditElementTitle()}
          name={elementToEdit.displayName}
          description={elementToEdit.help}
          image={elementToEdit.image}
          onSave={handleEdit}
          onCancel={hideEditModal}
        />
      </EuiOverlayMask>
    );
  };

  const renderDeleteModal = () => {
    if (!elementToDelete) {
      return null;
    }

    return (
      <ConfirmModal
        isOpen
        title={strings.getDeleteElementTitle(elementToDelete.displayName)}
        message={strings.getDeleteElementDescription()}
        confirmButtonText={strings.getDeleteButtonLabel()}
        cancelButtonText={strings.getCancelButtonLabel()}
        onConfirm={handleDelete}
        onCancel={hideDeleteModal}
      />
    );
  };

  const sortElements = (elements: CustomElement[]): CustomElement[] =>
    sortBy(elements, 'displayName');

  const onSearch = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  let customElementContent = (
    <EuiEmptyPrompt
      iconType="vector"
      title={<h2>{strings.getAddNewElementTitle()}</h2>}
      body={<p>{strings.getAddNewElementDescription()}</p>}
      titleSize="s"
    />
  );

  if (customElements.length) {
    customElementContent = (
      <ElementGrid
        elements={sortElements(customElements)}
        filterText={search}
        onClick={addCustomElement}
        onEdit={showEditModal}
        onDelete={showDeleteModal}
      />
    );
  }

  return (
    <Fragment>
      <EuiOverlayMask>
        <EuiModal
          onClose={onClose}
          className="canvasModal--fixedSize"
          maxWidth="1000px"
          initialFocus=".canvasElements__filter input"
        >
          <EuiModalHeader className="canvasAssetManager__modalHeader">
            <EuiModalHeaderTitle className="canvasAssetManager__modalHeaderTitle">
              {strings.getModalTitle()}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody style={{ paddingRight: '1px' }}>
            <EuiFieldSearch
              fullWidth
              value={search}
              placeholder={strings.getFindElementPlaceholder()}
              onChange={onSearch}
            />
            <EuiSpacer />
            {customElementContent}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton
              size="s"
              onClick={onClose}
              data-test-subj="saved-elements-modal-close-button"
            >
              {strings.getSavedElementsModalCloseButtonLabel()}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>

      {renderDeleteModal()}
      {renderEditModal()}
    </Fragment>
  );
};

SavedElementsModal.propTypes = {
  addCustomElement: PropTypes.func.isRequired,
  findCustomElements: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  removeCustomElement: PropTypes.func.isRequired,
  updateCustomElement: PropTypes.func.isRequired,
};
