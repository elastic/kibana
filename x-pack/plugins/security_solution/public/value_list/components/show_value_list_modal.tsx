/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { useListsPrivileges } from '../../detections/containers/detection_engine/lists/use_lists_privileges';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { ValueListModal } from './value_list_modal';

export const ShowValueListModal = ({
  listId,
  children,
  shouldShowContentIfModalNotAvailable,
}: {
  listId: string;
  children: React.ReactNode;
  shouldShowContentIfModalNotAvailable: boolean;
}) => {
  const [showModal, setShowModal] = useState(false);
  const { canWriteIndex, canReadIndex, loading } = useListsPrivileges();
  const isValueItemsListModalEnabled = useIsExperimentalFeatureEnabled('valueListItemsModal');

  const onCloseModal = useCallback(() => setShowModal(false), []);
  const onShowModal = useCallback(() => setShowModal(true), []);

  if (loading) return null;

  if (!canReadIndex || !isValueItemsListModalEnabled) {
    return shouldShowContentIfModalNotAvailable ? <>{children}</> : null;
  }

  return (
    <>
      <EuiLink data-test-subj={`show-value-list-modal-${listId}`} onClick={onShowModal}>
        {children}
      </EuiLink>
      {showModal && (
        <ValueListModal
          canWriteIndex={canWriteIndex ?? false}
          onCloseModal={onCloseModal}
          listId={listId}
        />
      )}
    </>
  );
};
