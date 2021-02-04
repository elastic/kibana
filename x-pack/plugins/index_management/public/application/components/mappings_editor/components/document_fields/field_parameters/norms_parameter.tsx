/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

type NormsParameterNames = 'norms' | 'norms_keyword';

export const NormsParameter = ({ configPath = 'norms' }: { configPath?: NormsParameterNames }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldTitle', {
      defaultMessage: 'Use norms',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldDescription', {
      defaultMessage:
        'Account for field length when scoring queries. Norms require significant memory and are not necessary for fields that are used solely for filtering or aggregations.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.normsDocLinkText', {
        defaultMessage: 'Norms documentation',
      }),
      href: documentationService.getNormsLink(),
    }}
    formFieldPath="norms"
    configPath={configPath}
  />
);
