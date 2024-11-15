/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEqual } from 'lodash';
import { css } from '@emotion/css';
import { EuiText, EuiButtonEmpty } from '@elastic/eui';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import type { FieldHook } from '../../../../shared_imports';
import * as i18n from './translations';

interface ThreatMatchIndexFieldProps {
  field: FieldHook<string[]>;
}

export const ThreatMatchIndexField = memo(function ThreatIndexField({
  field,
}: ThreatMatchIndexFieldProps): JSX.Element {
  const [defaultThreatIndices] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const isIndexModified = !isEqual(field.value, defaultThreatIndices);

  const handleResetIndices = useCallback(
    () => field.setValue(defaultThreatIndices),
    [field, defaultThreatIndices]
  );

  return (
    <ComboBoxField
      field={field as FieldHook<unknown>}
      idAria="ruleThreatMatchIndices"
      data-test-subj="ruleThreatMatchIndices"
      euiFieldProps={EUI_COMBOBOX_PROPS}
      label={i18n.THREAT_MATCH_INDEX_FIELD_LABEL}
      labelAppend={
        isIndexModified ? (
          <EuiButtonEmpty
            className={xxsHeight}
            size="xs"
            iconType="refresh"
            onClick={handleResetIndices}
          >
            {i18n.RESET_TO_DEFAULT_THREAT_MATCH_INDEX}
          </EuiButtonEmpty>
        ) : undefined
      }
      helpText={helpText}
    />
  );
});

const EUI_COMBOBOX_PROPS = {
  fullWidth: true,
  placeholder: '',
};

const helpText = <EuiText size="xs">{i18n.THREAT_MATCH_INDEX_FIELD_HELP_TEXT}</EuiText>;

const xxsHeight = css`
  height: 16px;
`;
