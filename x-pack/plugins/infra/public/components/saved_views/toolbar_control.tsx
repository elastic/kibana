/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import { SavedViewCreateModal } from './create_modal';
import { SavedViewUpdateModal } from './update_modal';
import { SavedViewManageViewsFlyout } from './manage_views_flyout';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { SavedView } from '../../containers/saved_view/saved_view';
import { SavedViewListModal } from './view_list_modal';

interface Props<ViewState> {
  viewState: ViewState;
}

export function SavedViewsToolbarControls<ViewState>(props: Props<ViewState>) {
  const kibana = useKibana();
  const {
    views,
    saveView,
    loading,
    updateView,
    deletedId,
    deleteView,
    defaultViewId,
    makeDefault,
    find,
    errorOnFind,
    errorOnCreate,
    createdId,
    updatedId,
    currentView,
    setCurrentView,
  } = useContext(SavedView.Context);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewListModalOpen, setViewListModalOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSavedViewMenuOpen, setIsSavedViewMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const openViewListModal = useCallback(() => {
    find();
    setViewListModalOpen(true);
  }, [setViewListModalOpen, find]);
  const closeViewListModal = useCallback(() => {
    setViewListModalOpen(false);
  }, [setViewListModalOpen]);
  const openSaveModal = useCallback(() => {
    setIsInvalid(false);
    setCreateModalOpen(true);
  }, []);
  const openUpdateModal = useCallback(() => {
    setIsInvalid(false);
    setUpdateModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const closeUpdateModal = useCallback(() => setUpdateModalOpen(false), []);
  const loadViews = useCallback(() => {
    find();
    setModalOpen(true);
  }, [find]);
  const showSavedViewMenu = useCallback(() => {
    setIsSavedViewMenuOpen(true);
  }, [setIsSavedViewMenuOpen]);
  const hideSavedViewMenu = useCallback(() => {
    setIsSavedViewMenuOpen(false);
  }, [setIsSavedViewMenuOpen]);
  const save = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      saveView({ name, ...currentState });
    },
    [props.viewState, saveView]
  );

  const update = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      updateView(currentView.id, { name, ...currentState });
    },
    [props.viewState, updateView, currentView]
  );

  useEffect(() => {
    if (errorOnCreate) {
      setIsInvalid(true);
    }
  }, [errorOnCreate]);

  useEffect(() => {
    if (updatedId !== undefined) {
      // INFO: Close the modal after the view is created.
      closeUpdateModal();
    }
  }, [updatedId, closeUpdateModal]);

  useEffect(() => {
    if (createdId !== undefined) {
      // INFO: Close the modal after the view is created.
      closeCreateModal();
    }
  }, [createdId, closeCreateModal]);

  useEffect(() => {
    if (deletedId !== undefined) {
      // INFO: Refresh view list after an item is deleted
      find();
    }
  }, [deletedId, find]);

  useEffect(() => {
    if (errorOnCreate) {
      kibana.notifications.toasts.warning(getErrorToast('create', errorOnCreate)!);
    } else if (errorOnFind) {
      kibana.notifications.toasts.warning(getErrorToast('find', errorOnFind)!);
    }
  }, [errorOnCreate, errorOnFind, kibana]);

  return (
    <>
      <EuiFlexGroup>
        <EuiPopover
          button={
            <EuiDescriptionList onClick={showSavedViewMenu}>
              <EuiDescriptionListTitle>Current View</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {currentView ? currentView.name : 'Default View'}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          }
          isOpen={isSavedViewMenuOpen}
          closePopover={hideSavedViewMenu}
          anchorPosition="upCenter"
        >
          <EuiListGroup flush={true}>
            <EuiListGroupItem iconType={'indexSettings'} onClick={loadViews} label="Manage Views" />

            <EuiListGroupItem iconType={'refresh'} onClick={openUpdateModal} label="Update View" />

            <EuiListGroupItem
              iconType={'importAction'}
              onClick={openViewListModal}
              label="Load View"
            />

            <EuiListGroupItem iconType={'save'} onClick={openSaveModal} label="Save new view" />

            <EuiListGroupItem
              onClick={() => {}}
              iconType={'editorUndo'}
              label="Reset view"
              isDisabled
            />
          </EuiListGroup>
        </EuiPopover>

        {/* <EuiButtonEmpty iconType="save" onClick={openSaveModal} data-test-subj="openSaveViewModal">
          <FormattedMessage
            defaultMessage="Save"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty iconType="importAction" onClick={loadViews} data-test-subj="loadViews">
          <FormattedMessage
            defaultMessage="Load"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty> */}
      </EuiFlexGroup>

      {createModalOpen && (
        <SavedViewCreateModal isInvalid={isInvalid} close={closeCreateModal} save={save} />
      )}

      {updateModalOpen && (
        <SavedViewUpdateModal isInvalid={isInvalid} close={closeUpdateModal} save={update} />
      )}

      {viewListModalOpen && (
        <SavedViewListModal<ViewState>
          views={views}
          close={closeViewListModal}
          setView={setCurrentView}
        />
      )}

      {modalOpen && (
        <SavedViewManageViewsFlyout<ViewState>
          loading={loading}
          views={views}
          defaultViewId={defaultViewId}
          makeDefault={makeDefault}
          deleteView={deleteView}
          close={closeModal}
          setView={setCurrentView}
        />
      )}
    </>
  );
}

const getErrorToast = (type: 'create' | 'find', msg?: string) => {
  if (type === 'create') {
    return {
      toastLifeTimeMs: 3000,
      title:
        msg ||
        i18n.translate('xpack.infra.savedView.errorOnCreate.title', {
          defaultMessage: `An error occured saving view.`,
        }),
    };
  } else if (type === 'find') {
    return {
      toastLifeTimeMs: 3000,
      title:
        msg ||
        i18n.translate('xpack.infra.savedView.findError.title', {
          defaultMessage: `An error occurred while loading views.`,
        }),
    };
  }
};
