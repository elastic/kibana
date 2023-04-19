/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useToggle from 'react-use/lib/useToggle';

import {
  EuiButtonEmpty,
  EuiModalFooter,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiButton,
  EuiPortal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedView } from '../../containers/saved_view/saved_view';

interface Props<ViewState> {
  views: Array<SavedView<ViewState>>;
  loading: boolean;
  sourceIsLoading: boolean;
  onClose(): void;
  onMakeDefaultView(id: string): void;
  setView(viewState: ViewState): void;
  onDeleteView(id: string): void;
}

interface DeleteConfimationProps {
  isDisabled?: boolean;
  onConfirm(): void;
}

const DeleteConfimation = ({ isDisabled, onConfirm }: DeleteConfimationProps) => {
  const [isConfirmVisible, toggleVisibility] = useToggle(false);

  return isConfirmVisible ? (
    <EuiFlexGroup>
      <EuiButtonEmpty onClick={toggleVisibility} data-test-subj="hideConfirm">
        <FormattedMessage defaultMessage="cancel" id="xpack.infra.waffle.savedViews.cancel" />
      </EuiButtonEmpty>
      <EuiButton
        disabled={isDisabled}
        fill={true}
        iconType="trash"
        color="danger"
        onClick={onConfirm}
        data-test-subj="showConfirm"
      >
        <FormattedMessage
          defaultMessage="Delete view?"
          id="xpack.infra.openView.actionNames.deleteConfirmation"
        />
      </EuiButton>
    </EuiFlexGroup>
  ) : (
    <EuiButtonEmpty
      data-test-subj="infraDeleteConfimationButton"
      iconType="trash"
      color="danger"
      onClick={toggleVisibility}
    />
  );
};

export function SavedViewManageViewsFlyout<ViewState>({
  onClose,
  views,
  setView,
  onMakeDefaultView,
  onDeleteView,
  loading,
  sourceIsLoading,
}: Props<ViewState>) {
  const [inProgressView, setInProgressView] = useState<string | null>(null);

  const renderName = (name: string, item: SavedView<ViewState>) => (
    <EuiButtonEmpty
      key={item.id}
      data-test-subj="infraRenderNameButton"
      onClick={() => {
        setView(item);
        onClose();
      }}
    >
      {name}
    </EuiButtonEmpty>
  );

  const renderDeleteAction = (item: SavedView<ViewState>) => {
    return (
      <DeleteConfimation
        key={item.id}
        isDisabled={item.isDefault}
        onConfirm={() => {
          onDeleteView(item.id);
        }}
      />
    );
  };

  const renderMakeDefaultAction = (item: SavedView<ViewState>) => {
    return (
      <EuiButtonEmpty
        key={item.id}
        data-test-subj="infraRenderMakeDefaultActionButton"
        isLoading={inProgressView === item.id && sourceIsLoading}
        iconType={item.isDefault ? 'starFilled' : 'starEmpty'}
        onClick={() => {
          setInProgressView(item.id);
          onMakeDefaultView(item.id);
        }}
      />
    );
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.infra.openView.columnNames.name', { defaultMessage: 'Name' }),
      sortable: true,
      truncateText: true,
      render: renderName,
    },
    {
      name: i18n.translate('xpack.infra.openView.columnNames.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: renderMakeDefaultAction,
        },
        {
          available: (item: SavedView<ViewState>) => item.id !== '0',
          render: renderDeleteAction,
        },
      ],
    },
  ];

  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} data-test-subj="loadViewsFlyout">
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                defaultMessage="Manage saved views"
                id="xpack.infra.openView.flyoutHeader"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiInMemoryTable
            items={views}
            columns={columns}
            loading={loading}
            search={true}
            pagination={true}
            sorting={true}
          />
        </EuiFlyoutBody>
        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelSavedViewModal" onClick={onClose}>
            <FormattedMessage defaultMessage="Cancel" id="xpack.infra.openView.cancelButton" />
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}
