/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEqual } from 'lodash';
import { css } from '@emotion/css';
import { EuiButtonEmpty } from '@elastic/eui';
import { useDefaultIndexPattern } from '../../../../../../hooks/use_default_index_pattern';
import type { FieldHook } from '../../../../../../../../shared_imports';
import { Field } from '../../../../../../../../shared_imports';
import * as i18n from './translations';

interface IndexPatternFieldProps {
  field: FieldHook<string[] | undefined>;
}

export function IndexPatternField({ field }: IndexPatternFieldProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const isIndexModified = !isEqual(field.value, defaultIndexPattern);

  const handleResetIndices = useCallback(
    () => field.setValue(defaultIndexPattern),
    [field, defaultIndexPattern]
  );

  return (
    <Field
      field={field as FieldHook<unknown>}
      idAria="indexPatternEdit"
      data-test-subj="indexPatternEdit"
      euiFieldProps={{
        fullWidth: true,
        placeholder: '',
      }}
      labelAppend={
        isIndexModified ? (
          <EuiButtonEmpty
            className={xxsHeight}
            size="xs"
            iconType="refresh"
            onClick={handleResetIndices}
          >
            {i18n.RESET_TO_DEFAULT_INDEX_PATTERNS}
          </EuiButtonEmpty>
        ) : undefined
      }
    />
  );
}

const xxsHeight = css`
  height: 16px;
`;
