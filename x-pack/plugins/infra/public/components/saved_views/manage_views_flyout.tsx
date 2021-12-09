/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

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
  defaultViewId: string;
  sourceIsLoading: boolean;
  close(): void;
  makeDefault(id: string): void;
  setView(viewState: ViewState): void;
  deleteView(id: string): void;
}

interface DeleteConfimationProps {
  isDisabled?: boolean;
  confirmedAction(): void;
}
const DeleteConfimation = (props: DeleteConfimationProps) => {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const showConfirm = useCallback(() => setConfirmVisible(true), []);
  const hideConfirm = useCallback(() => setConfirmVisible(false), []);

  return (
    <>
      {confirmVisible && (
        <EuiFlexGroup>
          <EuiButtonEmpty onClick={hideConfirm} data-test-subj="hideConfirm">
            <FormattedMessage defaultMessage="cancel" id="xpack.infra.waffle.savedViews.cancel" />
          </EuiButtonEmpty>
          <EuiButton
            disabled={props.isDisabled}
            fill={true}
            iconType="trash"
            color="danger"
            onClick={props.confirmedAction}
            data-test-subj="showConfirm"
          >
            <FormattedMessage
              defaultMessage="Delete view?"
              id="xpack.infra.openView.actionNames.deleteConfirmation"
            />
          </EuiButton>
        </EuiFlexGroup>
      )}
      {!confirmVisible && <EuiButtonEmpty iconType="trash" color="danger" onClick={showConfirm} />}
    </>
  );
};

export function SavedViewManageViewsFlyout<ViewState>({
  close,
  views,
  defaultViewId,
  setView,
  makeDefault,
  deleteView,
  loading,
  sourceIsLoading,
}: Props<ViewState>) {
  const [inProgressView, setInProgressView] = useState<string | null>(null);
  const renderName = useCallback(
    (name: string, item: SavedView<ViewState>) => (
      <EuiButtonEmpty
        onClick={() => {
          setView(item);
          close();
        }}
      >
        {name}
      </EuiButtonEmpty>
    ),
    [setView, close]
  );

  const renderDeleteAction = useCallback(
    (item: SavedView<ViewState>) => {
      if (item.id === '0') {
        return <></>;
      }

      return (
        <DeleteConfimation
          isDisabled={item.isDefault}
          confirmedAction={() => {
            deleteView(item.id);
          }}
        />
      );
    },
    [deleteView]
  );

  const renderMakeDefaultAction = useCallback(
    (item: SavedView<ViewState>) => {
      const isDefault = item.id === defaultViewId;
      return (
        <>
          <EuiButtonEmpty
            isLoading={inProgressView === item.id && sourceIsLoading}
            iconType={isDefault ? 'starFilled' : 'starEmpty'}
            onClick={() => {
              setInProgressView(item.id);
              makeDefault(item.id);
            }}
          />
        </>
      );
    },
    [makeDefault, defaultViewId, sourceIsLoading, inProgressView]
  );

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
          available: () => true,
          render: renderMakeDefaultAction,
        },
        {
          available: (item: SavedView<ViewState>) => true,
          render: renderDeleteAction,
        },
      ],
    },
  ];

  return (
    <EuiPortal>
      <EuiFlyout onClose={close} data-test-subj="loadViewsFlyout">
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
          <EuiButtonEmpty data-test-subj="cancelSavedViewModal" onClick={close}>
            <FormattedMessage defaultMessage="Cancel" id="xpack.infra.openView.cancelButton" />
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}
