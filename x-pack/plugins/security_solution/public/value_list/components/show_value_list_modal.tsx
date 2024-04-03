/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useState } from 'react';
import { useListsPrivileges } from '../../detections/containers/detection_engine/lists/use_lists_privileges';
import { ValueListModal } from './value_list_modal';

export const ShowValueListModal = ({
  listId,
  children,
  shouldShowChildrenIfNoPermissions,
}: {
  listId: string;
  children: React.ReactNode;
  shouldShowChildrenIfNoPermissions: boolean;
}) => {
  const [showModal, setShowModal] = useState(false);
  const { canWriteIndex, canReadIndex, loading } = useListsPrivileges();

  const onCloseModal = () => setShowModal(false);

  if (loading) return null;

  if (!canReadIndex) {
    return shouldShowChildrenIfNoPermissions ? <>{children}</> : null;
  }

  return (
    <>
      <EuiLink onClick={() => setShowModal(true)}>{children}</EuiLink>
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
