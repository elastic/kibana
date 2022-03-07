/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EnterpriseSearchPageTemplateWrapper } from '../../../../shared/layout';

import { AutomatedCuration } from './automated_curation';
import { CurationLogic } from './curation_logic';
import { ManualCuration } from './manual_curation';

export const Curation: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const { loadCuration } = useActions(CurationLogic({ curationId }));
  const { dataLoading, isAutomated } = useValues(CurationLogic({ curationId }));

  useEffect(() => {
    loadCuration();
  }, [curationId]);

  if (dataLoading) {
    return <EnterpriseSearchPageTemplateWrapper isLoading />;
  }
  return isAutomated ? <AutomatedCuration /> : <ManualCuration />;
};
