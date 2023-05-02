/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPopover, EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedViewManageViewsFlyout } from './manage_views_flyout';
import { useSavedViewContext } from '../../containers/saved_view/saved_view';
import { SavedViewListModal } from './view_list_modal';
import { useBoolean } from '../../hooks/use_boolean';
import { UpsertViewModal } from './upsert_modal';

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
    makeDefault,
    sourceIsLoading,
    find,
    errorOnFind,
    errorOnCreate,
    createdView,
    updatedView,
    currentView,
    setCurrentView,
  } = useSavedViewContext();

  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [isManageFlyoutOpen, { on: openManageFlyout, off: closeManageFlyout }] = useBoolean(false);
  const [isUpdateModalOpen, { on: openUpdateModal, off: closeUpdateModal }] = useBoolean(false);
  const [isLoadModalOpen, { on: openLoadModal, off: closeLoadModal }] = useBoolean(false);
  const [isCreateModalOpen, { on: openCreateModal, off: closeCreateModal }] = useBoolean(false);

  const [isInvalid, setIsInvalid] = useState(false);

  const goToManageViews = () => {
    closePopover();
    find();
    openManageFlyout();
  };

  const goToLoadView = () => {
    closePopover();
    find();
    openLoadModal();
  };

  const goToCreateView = () => {
    closePopover();
    setIsInvalid(false);
    openCreateModal();
  };

  const goToUpdateView = () => {
    closePopover();
    setIsInvalid(false);
    openUpdateModal();
  };

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
      <EuiPopover
        data-test-subj="savedViews-popover"
        button={
          <EuiButton
            onClick={togglePopover}
            data-test-subj="savedViews-openPopover"
            iconType="arrowDown"
            iconSide="right"
            color="text"
          >
            {currentView
              ? currentView.name
              : i18n.translate('xpack.infra.savedView.unknownView', {
                  defaultMessage: 'No view selected',
                })}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="leftCenter"
      >
        <EuiListGroup flush={true}>
          <EuiListGroupItem
            data-test-subj="savedViews-manageViews"
            iconType="indexSettings"
            onClick={goToManageViews}
            label={i18n.translate('xpack.infra.savedView.manageViews', {
              defaultMessage: 'Manage views',
            })}
          />
          <EuiListGroupItem
            data-test-subj="savedViews-updateView"
            iconType="refresh"
            onClick={goToUpdateView}
            isDisabled={!currentView || currentView.id === '0'}
            label={i18n.translate('xpack.infra.savedView.updateView', {
              defaultMessage: 'Update view',
            })}
          />
          <EuiListGroupItem
            data-test-subj="savedViews-loadView"
            iconType="importAction"
            onClick={goToLoadView}
            label={i18n.translate('xpack.infra.savedView.loadView', {
              defaultMessage: 'Load view',
            })}
          />
          <EuiListGroupItem
            data-test-subj="savedViews-saveNewView"
            iconType="save"
            onClick={goToCreateView}
            label={i18n.translate('xpack.infra.savedView.saveNewView', {
              defaultMessage: 'Save new view',
            })}
          />
        </EuiListGroup>
      </EuiPopover>
      {isCreateModalOpen && (
        <UpsertViewModal
          isInvalid={isInvalid}
          onClose={closeCreateModal}
          onSave={save}
          title={
            <FormattedMessage
              defaultMessage="Save View"
              id="xpack.infra.waffle.savedView.createHeader"
            />
          }
        />
      )}
      {isUpdateModalOpen && (
        <UpsertViewModal
          isInvalid={isInvalid}
          onClose={closeUpdateModal}
          onSave={update}
          initialName={currentView.name}
          initialIncludeTime={Boolean(currentView.time)}
          title={
            <FormattedMessage
              defaultMessage="Update View"
              id="xpack.infra.waffle.savedView.updateHeader"
            />
          }
        />
      )}
      {isLoadModalOpen && (
        <SavedViewListModal<any>
          currentView={currentView}
          views={views}
          onClose={closeLoadModal}
          setView={setCurrentView}
        />
      )}
      {isManageFlyoutOpen && (
        <SavedViewManageViewsFlyout<ViewState>
          sourceIsLoading={sourceIsLoading}
          loading={loading}
          views={views}
          onMakeDefaultView={makeDefault}
          onDeleteView={deleteView}
          onClose={closeManageFlyout}
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
