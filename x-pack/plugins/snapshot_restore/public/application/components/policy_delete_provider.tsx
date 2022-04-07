/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal } from '@elastic/eui';

import { deletePolicies } from '../services/http';

interface Props {
  children: (deletePolicy: DeletePolicy) => React.ReactElement;
}

export type DeletePolicy = (names: string[], onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (policiesDeleted: string[]) => void;

export const PolicyDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const [policyNames, setPolicyNames] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const policiesToDelete = [...policyNames];
  const { mutate: deletePoliciesMutation } = deletePolicies(policiesToDelete);

  const deletePolicyPrompt: DeletePolicy = (names, onSuccess = () => undefined) => {
    if (!names || !names.length) {
      throw new Error('No policy names specified for deletion');
    }
    setIsModalOpen(true);
    setPolicyNames(names);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPolicyNames([]);
  };

  const deletePolicy = () => {
    deletePoliciesMutation(policiesToDelete);
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const isSingle = policyNames.length === 1;

    return (
      <EuiConfirmModal
        title={
          isSingle ? (
            <FormattedMessage
              id="xpack.snapshotRestore.deletePolicy.confirmModal.deleteSingleTitle"
              defaultMessage="Delete policy '{name}'?"
              values={{ name: policyNames[0] }}
            />
          ) : (
            <FormattedMessage
              id="xpack.snapshotRestore.deletePolicy.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count} policies?"
              values={{ count: policyNames.length }}
            />
          )
        }
        onCancel={closeModal}
        onConfirm={deletePolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.deletePolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.snapshotRestore.deletePolicy.confirmModal.confirmButtonLabel"
            defaultMessage="Delete {count, plural, one {policy} other {policies}}"
            values={{ count: policyNames.length }}
          />
        }
        buttonColor="danger"
        data-test-subj="srdeletePolicyConfirmationModal"
      >
        {!isSingle ? (
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.deletePolicy.confirmModal.deleteMultipleListDescription"
                defaultMessage="You are about to delete these policies:"
              />
            </p>
            <ul>
              {policyNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </Fragment>
        ) : null}
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(deletePolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
