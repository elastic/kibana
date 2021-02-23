/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { PacksPage } from './list';
import { NewPackPage } from './new';
import { EditPackPage } from './edit';

const PacksComponent = () => {
  const [showNewPackForm, setShowNewPackForm] = useState(false);
  const [editPackId, setEditPackId] = useState<string | null>(null);

  const goBack = useCallback(() => {
    setShowNewPackForm(false);
    setEditPackId(null);
  }, []);

  const handleNewQueryClick = useCallback(() => setShowNewPackForm(true), []);

  if (showNewPackForm) {
    return <NewPackPage onSuccess={goBack} />;
  }

  if (editPackId?.length) {
    return <EditPackPage onSuccess={goBack} packId={editPackId} />;
  }

  return <PacksPage onNewClick={handleNewQueryClick} onEditClick={setEditPackId} />;
};

export const Packs = React.memo(PacksComponent);
