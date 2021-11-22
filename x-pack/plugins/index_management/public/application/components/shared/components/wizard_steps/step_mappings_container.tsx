/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { Forms } from '../../../../../shared_imports';
import { useLoadNodesPlugins } from '../../../../services';
import { CommonWizardSteps } from './types';
import { StepMappings } from './step_mappings';

interface Props {
  esDocsBase: string;
}

export const StepMappingsContainer: React.FunctionComponent<Props> = ({ esDocsBase }) => {
  const { defaultValue, updateContent, getSingleContentData } = Forms.useContent<
    CommonWizardSteps,
    'mappings'
  >('mappings');
  const { data: plugins } = useLoadNodesPlugins();
  const [esNodesPlugins, setEsNodesPlugins] = useState<string[]>([]);

  useEffect(() => {
    if (plugins) {
      setEsNodesPlugins(plugins);
    }
  }, [plugins]);

  return (
    <StepMappings
      defaultValue={defaultValue}
      onChange={updateContent}
      indexSettings={getSingleContentData('settings')}
      esDocsBase={esDocsBase}
      esNodesPlugins={esNodesPlugins}
    />
  );
};
