/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { PackForm } from '../../../packs/form';
import { usePack } from '../../../packs/use_pack';
import { useDeletePack } from '../../../packs/use_delete_pack';

import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

const EditPackPageComponent = () => {
  const { packId } = useParams<{ packId: string }>();
  const queryDetailsLinkProps = useRouterNavigate(`packs/${packId}`);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { isLoading, data } = usePack({ packId });
  const deletePackMutation = useDeletePack({ packId, withRedirect: true });

  useBreadcrumbs('pack_edit', {
    packId: data?.id ?? '',
    packName: data?.name ?? '',
  });

  const handleCloseDeleteConfirmationModal = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirmClick = useCallback(() => {
    deletePackMutation.mutateAsync().then(() => {
      handleCloseDeleteConfirmationModal();
    });
  }, [deletePackMutation, handleCloseDeleteConfirmationModal]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...queryDetailsLinkProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editPack.viewPackListTitle"
              defaultMessage="View {queryName} details"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{ queryName: data?.name }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.editPack.pageTitle"
                defaultMessage="Edit {queryName}"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queryName: data?.name,
                }}
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [data?.name, queryDetailsLinkProps]
  );

  const RightColumn = useMemo(
    () => (
      <EuiButton color="danger" onClick={handleDeleteClick} iconType="trash">
        <FormattedMessage
          id="xpack.osquery.editPack.deletePackButtonLabel"
          defaultMessage="Delete pack"
        />
      </EuiButton>
    ),
    [handleDeleteClick]
  );

  if (isLoading) return null;

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumn={RightColumn} rightColumnGrow={false}>
      {!data ? <EuiLoadingContent lines={10} /> : <PackForm editMode={true} defaultValue={data} />}
      {isDeleteModalVisible ? (
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.osquery.deletePack.confirmationModal.title"
              defaultMessage="Are you sure you want to delete this pack?"
            />
          }
          onCancel={handleCloseDeleteConfirmationModal}
          onConfirm={handleDeleteConfirmClick}
          cancelButtonText={
            <FormattedMessage
              id="xpack.osquery.deletePack.confirmationModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.osquery.deletePack.confirmationModal.confirmButtonLabel"
              defaultMessage="Confirm"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id="xpack.osquery.deletePack.confirmationModal.body"
            defaultMessage="You're about to delete this pack. Are you sure you want to do this?"
          />
        </EuiConfirmModal>
      ) : null}
    </WithHeaderLayout>
  );
};

export const EditPackPage = React.memo(EditPackPageComponent);
