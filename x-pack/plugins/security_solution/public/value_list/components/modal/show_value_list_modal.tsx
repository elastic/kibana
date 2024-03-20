/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useState } from 'react';
import { ValueListModal } from './value_list_modal';

export const ShowValueListModal = ({
  listId,
  children,
}: {
  listId: string;
  children: React.ReactNode;
}) => {
  const [showModal, setShowModal] = useState(false);

  const onCloseModal = () => setShowModal(false);

  return (
    <>
      <EuiLink onClick={() => setShowModal(true)}>{children}</EuiLink>
      {showModal && <ValueListModal onCloseModal={onCloseModal} listId={listId} />}
    </>
  );
};
