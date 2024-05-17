/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { ParameterName } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  configPath?: ParameterName;
  description?: string | JSX.Element;
}

export const EagerGlobalOrdinalsParameter = ({
  description,
  configPath = 'eager_global_ordinals',
}: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldTitle', {
      defaultMessage: 'Build global ordinals at index time',
    })}
    description={
      description
        ? description
        : i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsFieldDescription', {
            defaultMessage:
              'By default, global ordinals are built at search time, which optimizes for index speed. You can optimize for search performance by building them at index time instead.',
          })
    }
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.eagerGlobalOrdinalsDocLinkText', {
        defaultMessage: 'Global ordinals documentation',
      }),
      href: documentationService.getEagerGlobalOrdinalsLink(),
    }}
    formFieldPath="eager_global_ordinals"
    configPath={configPath}
  />
);
