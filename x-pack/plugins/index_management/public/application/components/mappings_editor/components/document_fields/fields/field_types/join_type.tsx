/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';
import { RelationsParameter, EagerGlobalOrdinalsParameter } from '../../field_parameters';

const i18nTexts = {
  eagerGlobalOrdinalsDescription: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.join.eagerGlobalOrdinalsFieldDescription',
    {
      defaultMessage:
        'The join field uses global ordinals to speed up joins. By default, if the index has changed, global ordinals for the join field will be rebuilt as part of the refresh. This can add significant time to the refresh, however most of the times this is the right trade-off.',
    }
  ),
};

export const JoinType = () => {
  return (
    <>
      <BasicParametersSection>
        <RelationsParameter />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <EagerGlobalOrdinalsParameter
          configPath="eager_global_ordinals_join"
          description={i18nTexts.eagerGlobalOrdinalsDescription}
        />
      </AdvancedParametersSection>
    </>
  );
};
