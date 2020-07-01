/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
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
    sourceIsLoading,
    find,
    errorOnFind,
    errorOnCreate,
    createdView,
    updatedView,
    currentView,
    setCurrentView,
  } = useContext(SavedView.Context);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewListModalOpen, setViewListModalOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSavedViewMenuOpen, setIsSavedViewMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const hideSavedViewMenu = useCallback(() => {
    setIsSavedViewMenuOpen(false);
  }, [setIsSavedViewMenuOpen]);
  const openViewListModal = useCallback(() => {
    hideSavedViewMenu();
    find();
    setViewListModalOpen(true);
  }, [setViewListModalOpen, find, hideSavedViewMenu]);
  const closeViewListModal = useCallback(() => {
    setViewListModalOpen(false);
  }, [setViewListModalOpen]);
  const openSaveModal = useCallback(() => {
    hideSavedViewMenu();
    setIsInvalid(false);
    setCreateModalOpen(true);
  }, [hideSavedViewMenu]);
  const openUpdateModal = useCallback(() => {
    hideSavedViewMenu();
    setIsInvalid(false);
    setUpdateModalOpen(true);
  }, [hideSavedViewMenu]);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const closeUpdateModal = useCallback(() => setUpdateModalOpen(false), []);
  const loadViews = useCallback(() => {
    hideSavedViewMenu();
    find();
    setModalOpen(true);
  }, [find, hideSavedViewMenu]);
  const showSavedViewMenu = useCallback(() => {
    setIsSavedViewMenuOpen(true);
  }, [setIsSavedViewMenuOpen]);
  const save = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      saveView({ ...currentState, name });
    },
    [props.viewState, saveView]
  );

  const update = useCallback(
    (name: string, hasTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!hasTime ? { time: undefined } : {}),
      };
      updateView(currentView.id, { ...currentState, name });
    },
    [props.viewState, updateView, currentView]
  );

  useEffect(() => {
    if (errorOnCreate) {
      setIsInvalid(true);
    }
  }, [errorOnCreate]);

  useEffect(() => {
    if (updatedView !== undefined) {
      setCurrentView(updatedView);
      // INFO: Close the modal after the view is created.
      closeUpdateModal();
    }
  }, [updatedView, setCurrentView, closeUpdateModal]);

  useEffect(() => {
    if (createdView !== undefined) {
      // INFO: Close the modal after the view is created.
      setCurrentView(createdView);
      closeCreateModal();
    }
  }, [createdView, setCurrentView, closeCreateModal]);

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
            <EuiFlexGroup gutterSize={'s'} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate('xpack.infra.savedView.changeView', {
                    defaultMessage: 'Change view',
                  })}
                  onClick={showSavedViewMenu}
                  iconType="globe"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList onClick={showSavedViewMenu}>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      defaultMessage="Current view"
                      id="xpack.infra.savedView.currentView"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {currentView
                      ? currentView.name
                      : i18n.translate('xpack.infra.savedView.unknownView', {
                          defaultMessage: 'Unknown',
                        })}
                  </EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          isOpen={isSavedViewMenuOpen}
          closePopover={hideSavedViewMenu}
          anchorPosition="upCenter"
        >
          <EuiListGroup flush={true}>
            <EuiListGroupItem
              iconType={'indexSettings'}
              onClick={loadViews}
              label={i18n.translate('xpack.infra.savedView.manageViews', {
                defaultMessage: 'Manage views',
              })}
            />

            <EuiListGroupItem
              iconType={'refresh'}
              onClick={openUpdateModal}
              disabled={!currentView || currentView.id === '0'}
              label={i18n.translate('xpack.infra.savedView.updateView', {
                defaultMessage: 'Update view',
              })}
            />

            <EuiListGroupItem
              iconType={'importAction'}
              onClick={openViewListModal}
              label={i18n.translate('xpack.infra.savedView.loadView', {
                defaultMessage: 'Load view',
              })}
            />

            <EuiListGroupItem
              iconType={'save'}
              onClick={openSaveModal}
              label={i18n.translate('xpack.infra.savedView.saveNewView', {
                defaultMessage: 'Save new view',
              })}
            />
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexGroup>

      {createModalOpen && (
        <SavedViewCreateModal isInvalid={isInvalid} close={closeCreateModal} save={save} />
      )}

      {updateModalOpen && (
        <SavedViewUpdateModal
          currentView={currentView}
          isInvalid={isInvalid}
          close={closeUpdateModal}
          save={update}
        />
      )}

      {viewListModalOpen && (
        <SavedViewListModal<any>
          currentView={currentView}
          views={views}
          close={closeViewListModal}
          setView={setCurrentView}
        />
      )}

      {modalOpen && (
        <SavedViewManageViewsFlyout<ViewState>
          sourceIsLoading={sourceIsLoading}
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
