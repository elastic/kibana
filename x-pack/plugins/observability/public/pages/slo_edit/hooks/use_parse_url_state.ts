/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { CreateSLOInput } from '@kbn/slo-schema';
import { useHistory } from 'react-router-dom';
import { transformPartialCreateSLOInputToPartialCreateSLOForm } from '../helpers/process_slo_form_values';
import { CreateSLOForm } from '../types';

export function useParseUrlState(): Partial<CreateSLOForm> | null {
  const history = useHistory();
  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const urlParams = urlStateStorage.get<Partial<CreateSLOInput>>('_a');

  return !!urlParams ? transformPartialCreateSLOInputToPartialCreateSLOForm(urlParams) : null;
}
