/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { Space } from '../../../../common';
import type { SpacesManager } from '../../../spaces_manager';

interface Props {
  space: Space;
  spacesManager: SpacesManager;
  onCancel(): void;
  onSuccess?(): void;
}

export const ConfirmDeleteModal: FunctionComponent<Props> = ({
  space,
  onSuccess,
  onCancel,
  spacesManager,
}) => {
  const { services } = useKibana();

  const { value: isCurrentSpace } = useAsync(
    async () => space.id === (await spacesManager.getActiveSpace()).id,
    [space.id]
  );

  const [state, deleteSpace] = useAsyncFn(async () => {
    try {
      await spacesManager.deleteSpace(space);
      services.notifications!.toasts.addSuccess(
        i18n.translate('xpack.spaces.management.confirmDeleteModal.successMessage', {
          defaultMessage: "Deleted space '{name}'",
          values: { name: space.name },
        })
      );
      if (isCurrentSpace) {
        spacesManager.redirectToSpaceSelector();
      } else {
        onSuccess?.();
      }
    } catch (error) {
      services.notifications!.toasts.addDanger({
        title: i18n.translate('xpack.spaces.management.confirmDeleteModal.errorMessage', {
          defaultMessage: "Could not delete space '{name}'",
          values: { name: space.name },
        }),
        text: (error as any).body?.message || error.message,
      });
    }
  }, [isCurrentSpace]);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.spaces.management.confirmDeleteModal.title', {
        defaultMessage: "Delete space '{name}'?",
        values: { name: space.name },
      })}
      onCancel={onCancel}
      onConfirm={deleteSpace}
      cancelButtonText={i18n.translate('xpack.spaces.management.confirmDeleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.spaces.management.confirmDeleteModal.confirmButton',
        {
          defaultMessage:
            '{isLoading, select, true{Deleting space and all contents…} other{Delete space and all contents}}',
          values: { isLoading: state.loading },
        }
      )}
      buttonColor="danger"
      isLoading={state.loading}
    >
      {isCurrentSpace && (
        <>
          <EuiCallOut
            color="warning"
            iconType="alert"
            title={i18n.translate('xpack.spaces.management.confirmDeleteModal.currentSpaceTitle', {
              defaultMessage: 'You are currently in this space.',
            })}
          >
            <FormattedMessage
              id="xpack.spaces.management.confirmDeleteModal.currentSpaceDescription"
              defaultMessage="Once deleted, you must choose a different space."
            />
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.spaces.management.confirmDeleteModal.description"
            defaultMessage="This space and {allContents} will be permanently deleted."
            values={{
              allContents: (
                <strong>
                  <FormattedMessage
                    id="xpack.spaces.management.confirmDeleteModal.allContents"
                    defaultMessage="all contents"
                  />
                </strong>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.spaces.management.confirmDeleteModal.cannotUndoWarning"
            defaultMessage="You can't recover deleted spaces."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
