/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { QueriesPage } from './queries';
import { NewSavedQueryPage } from './new';
import { EditSavedQueryPage } from './edit';

const QueriesComponent = () => {
  const [showNewSavedQueryForm, setShowNewSavedQueryForm] = useState(false);
  const [editSavedQueryId, setEditSavedQueryId] = useState<string | null>(null);

  const goBack = useCallback(() => {
    setShowNewSavedQueryForm(false);
    setEditSavedQueryId(null);
  }, []);

  const handleNewQueryClick = useCallback(() => setShowNewSavedQueryForm(true), []);

  if (showNewSavedQueryForm) {
    return <NewSavedQueryPage onSuccess={goBack} />;
  }

  if (editSavedQueryId?.length) {
    return <EditSavedQueryPage onSuccess={goBack} savedQueryId={editSavedQueryId} />;
  }

  return <QueriesPage onNewClick={handleNewQueryClick} onEditClick={setEditSavedQueryId} />;
};

export const Queries = React.memo(QueriesComponent);
