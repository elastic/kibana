/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPopover, EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InventoryView } from '../../../common/inventory_views';
import { SavedViewManageViewsFlyout } from './manage_views_flyout';
import { SavedViewListModal } from './view_list_modal';
import { useBoolean } from '../../hooks/use_boolean';
import { UpsertViewModal } from './upsert_modal';

interface Props<ViewState> {
  viewState: ViewState & { time?: number };
  currentView: InventoryView;
  views: InventoryView[];
  isFetchingViews: boolean;
  isFetchingCurrentView: boolean;
  onCreateView: (attributes: any) => Promise<void>;
  onUpdateView: ({ id, attributes }: { id: string; attributes: any }) => Promise<void>;
  onDeleteView: () => void;
  onLoadViews: () => void;
  onSetDefaultView: (id: string) => void;
  onSwitchView: (id: string) => void;
}

export function SavedViewsToolbarControls<ViewState>(props: Props<ViewState>) {
  const {
    currentView,
    views,
    isFetchingViews,
    isFetchingCurrentView,
    onCreateView,
    onDeleteView,
    onUpdateView,
    onLoadViews,
    onSetDefaultView,
    onSwitchView,
    viewState,
  } = props;
  // const {
  //   views,
  //   saveView,
  //   loading,
  //   updateView,
  //   deletedId,
  //   deleteView,
  //   makeDefault,
  //   sourceIsLoading,
  //   find,
  //   errorOnFind,
  //   errorOnCreate,
  //   createdView,
  //   updatedView,
  //   currentView,
  //   setCurrentView,
  // } = useSavedViewContext();

  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const [isManageFlyoutOpen, { on: openManageFlyout, off: closeManageFlyout }] = useBoolean(false);
  const [isUpdateModalOpen, { on: openUpdateModal, off: closeUpdateModal }] = useBoolean(false);
  // const [isLoadModalOpen, { on: openLoadModal, off: closeLoadModal }] = useBoolean(false);
  const [isCreateModalOpen, { on: openCreateModal, off: closeCreateModal }] = useBoolean(false);

  const [isInvalid, setIsInvalid] = useState(false);

  const goToManageViews = () => {
    closePopover();
    onLoadViews();
    openManageFlyout();
  };

  // const goToLoadView = () => {
  //   closePopover();
  //   onLoadViews();
  //   openLoadModal();
  // };

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

  const handleCreateView = (name: string, shouldIncludeTime: boolean = false) => {
    const attributes = { ...viewState, name };

    if (!shouldIncludeTime) {
      delete attributes.time;
    }

    onCreateView(attributes).then(closeCreateModal);
  };

  const handleUpdateView = (name: string, shouldIncludeTime: boolean = false) => {
    const attributes = { ...viewState, name };

    if (!shouldIncludeTime) {
      delete attributes.time;
    }

    onUpdateView({ id: currentView.id, attributes }).then(closeUpdateModal);
  };

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
            isLoading={isFetchingCurrentView}
          >
            {currentView
              ? currentView.attributes.name
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
            isDisabled={!currentView || currentView.attributes.isStatic}
            label={i18n.translate('xpack.infra.savedView.updateView', {
              defaultMessage: 'Update view',
            })}
          />
          {/* <EuiListGroupItem
            data-test-subj="savedViews-loadView"
            iconType="importAction"
            onClick={goToLoadView}
            label={i18n.translate('xpack.infra.savedView.loadView', {
              defaultMessage: 'Load view',
            })}
          /> */}
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
          onSave={handleCreateView}
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
          onSave={handleUpdateView}
          initialName={currentView?.attributes.name}
          initialIncludeTime={Boolean(currentView?.attributes.time)}
          title={
            <FormattedMessage
              defaultMessage="Update View"
              id="xpack.infra.waffle.savedView.updateHeader"
            />
          }
        />
      )}
      {/* {isLoadModalOpen && (
        <SavedViewListModal<any>
          currentView={currentView}
          views={views}
          onClose={closeLoadModal}
          onSwitchView={onSwitchView}
        />
      )} */}
      {isManageFlyoutOpen && (
        <SavedViewManageViewsFlyout
          loading={isFetchingViews}
          views={views}
          onMakeDefaultView={onSetDefaultView}
          onDeleteView={onDeleteView}
          onClose={closeManageFlyout}
          onSwitchView={onSwitchView}
        />
      )}
    </>
  );
}
